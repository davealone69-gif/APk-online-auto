import { FileNode } from "../types";

const GITHUB_API_BASE = "https://api.github.com";

export async function fetchGitHubUser(token: string) {
  const res = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) throw new Error("Invalid GitHub Token");
  return res.json();
}

export async function createOrGetRepo(token: string, repoName: string): Promise<any> {
  // Check if exists
  const user = await fetchGitHubUser(token);
  const checkRes = await fetch(`${GITHUB_API_BASE}/repos/${user.login}/${repoName}`, {
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" },
  });
  if (checkRes.ok) return checkRes.json();

  // Create if missing
  const createRes = await fetch(`${GITHUB_API_BASE}/user/repos`, {
    method: "POST",
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" },
    body: JSON.stringify({ name: repoName, private: true, auto_init: true }),
  });
  
  if (!createRes.ok) throw new Error("Failed to create repository");
  // Wait a moment for auto_init to finish
  await new Promise(r => setTimeout(r, 2000));
  return createRes.json();
}

// Flatten tree to get path -> content
function flattenTree(node: FileNode, path = ""): { path: string; content: string }[] {
  let files: { path: string; content: string }[] = [];
  const currentPath = path ? `${path}/${node.name}` : node.name;
  
  if (node.type === "file" && node.content !== undefined) {
    files.push({ path: currentPath, content: node.content });
  } else if (node.children) {
    node.children.forEach(child => {
      files = files.concat(flattenTree(child, currentPath));
    });
  }
  return files;
}

export async function pushFilesToRepo(token: string, owner: string, repo: string, projectTree: FileNode, onLog: (msg: string) => void) {
  // 1. Get flat files
  // Strip root node name (e.g. Everything4DroidApp)
  let filesToPush: {path: string; content: string}[] = [];
  if (projectTree.children) {
    projectTree.children.forEach(child => {
      filesToPush = filesToPush.concat(flattenTree(child, ""));
    });
  }

  // Inject GitHub Actions workflow
  const workflowContent = `name: Android CI
on: [push, workflow_dispatch]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Setup Java JDK
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
    - name: Setup Gradle
      uses: gradle/actions/setup-gradle@v3
    - name: Ensure gradlew is executable
      run: if [ -f ./gradlew ]; then chmod +x ./gradlew; fi
    - name: Build with Gradle
      run: |
        if [ -f ./gradlew ]; then
          ./gradlew assembleDebug
        else
          gradle assembleDebug
        fi
    - name: Upload APK
      uses: actions/upload-artifact@v4
      with:
        name: app-debug
        path: app/build/outputs/apk/debug/app-debug.apk
`;
  filesToPush.push({ path: ".github/workflows/android-build.yml", content: workflowContent });

  const headers = { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" };

  onLog("Fetching branch data...");
  const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers });
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch || "main";

  const refRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`, { headers });
  if (!refRes.ok) throw new Error("Failed to get branch reference. Ensure the repo is initialized.");
  const refData = await refRes.json();
  const latestCommitSha = refData.object.sha;

  onLog("Retrieving latest commit tree...");
  const commitRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;

  onLog("Uploading files via GitHub API...");
  // Create Blobs for each file
  const treeItems = await Promise.all(filesToPush.map(async (file) => {
    return {
      path: file.path,
      mode: "100644",
      type: "blob",
      content: file.content
    };
  }));

  // Create new Tree
  const createTreeRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    headers,
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
  });
  const createTreeData = await createTreeRes.json();
  const newTreeSha = createTreeData.sha;

  onLog("Creating new commit...");
  const createCommitRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message: "Build triggered from E4D IDE",
      tree: newTreeSha,
      parents: [latestCommitSha]
    })
  });
  const createCommitData = await createCommitRes.json();
  const newCommitSha = createCommitData.sha;

  onLog("Updating branch reference...");
  await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ sha: newCommitSha, force: true })
  });
  onLog("Push complete!");
}

export async function pollWorkflowRun(token: string, owner: string, repo: string, onLog: (msg: string) => void) {
  const headers = { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" };
  
  // Wait a few seconds for GitHub to register the workflow trigger
  await new Promise(r => setTimeout(r, 5000));
  
  onLog("Querying GitHub Actions for the latest workflow run...");
  const runsRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs?per_page=1`, { headers });
  const runsData = await runsRes.json();
  
  if (runsData.total_count === 0) {
    throw new Error("No workflow runs found. Check Actions settings.");
  }
  
  const runId = runsData.workflow_runs[0].id;
  onLog(`Found Workflow Run #${runId}. Waiting for completion...`);

  return new Promise<{runId: string}>((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const checkRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${runId}`, { headers });
        const checkData = await checkRes.json();
        const status = checkData.status;
        const conclusion = checkData.conclusion;
        
        if (status === "completed") {
          clearInterval(interval);
          if (conclusion === "success") {
            onLog("✅ APK compiled successfully on GitHub Cloud!");
            resolve({ runId });
          } else {
            const err = new Error(`Build failed with status: ${conclusion}`);
            (err as any).runId = runId;
            reject(err);
          }
        } else {
          // Log heartbeat
          onLog(`Build status: ${status}... (Running on GitHub servers)`);
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, 10000); // Check every 10 seconds
  });
}

export async function getFailedJobLog(token: string, owner: string, repo: string, runId: string) {
  const headers = { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" };
  
  // Get jobs
  const jobsRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, { headers });
  const jobsData = await jobsRes.json();
  
  const failedJob = jobsData.jobs.find((j: any) => j.conclusion === "failure");
  if (!failedJob) return "No failed job found to retrieve logs from.";
  
  // Get logs for failed job
  const logRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/jobs/${failedJob.id}/logs`, { headers });
  
  // GitHub returns plain text logs for jobs
  const logText = await logRes.text();
  // Return just the last 150 lines to keep prompt size manageable
  const lines = logText.split('\n');
  return lines.slice(Math.max(lines.length - 150, 0)).join('\n');
}

export async function getArtifactDownloadUrl(token: string, owner: string, repo: string) {
  const headers = { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" };
  
  const runsRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs?per_page=1`, { headers });
  const runsData = await runsRes.json();
  const runId = runsData.workflow_runs[0].id;

  const artifactsRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`, { headers });
  const artifactsData = await artifactsRes.json();

  if (artifactsData.total_count === 0) {
    throw new Error("No APK artifact found.");
  }

  // Return the artifact download ID to use directly if needed
  return artifactsData.artifacts[0].archive_download_url;
}
