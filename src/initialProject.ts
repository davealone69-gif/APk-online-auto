import { FileNode } from "./types";

export const initialProjectTree: FileNode = {
  name: "Everything4DroidApp",
  path: "",
  type: "directory",
  children: [
    {
      name: "app",
      path: "app",
      type: "directory",
      children: [
        {
          name: "src",
          path: "app/src",
          type: "directory",
          children: [
            {
              name: "main",
              path: "app/src/main",
              type: "directory",
              children: [
                {
                  name: "java",
                  path: "app/src/main/java",
                  type: "directory",
                  children: [
                    {
                      name: "com",
                      path: "app/src/main/java/com",
                      type: "directory",
                      children: [
                        {
                          name: "example",
                          path: "app/src/main/java/com/example",
                          type: "directory",
                          children: [
                            {
                              name: "droidapp",
                              path: "app/src/main/java/com/example/droidapp",
                              type: "directory",
                              children: [
                                {
                                  name: "MainActivity.kt",
                                  path: "app/src/main/java/com/example/droidapp/MainActivity.kt",
                                  type: "file",
                                  content: `package com.example.droidapp

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private var clickCount = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val titleTextView = findViewById<TextView>(R.id.titleTextView)
        val clickButton = findViewById<Button>(R.id.clickButton)
        val resetButton = findViewById<Button>(R.id.resetButton)

        clickButton.setOnClickListener {
            clickCount++
            titleTextView.text = "Button clicked $clickCount times!"
            Toast.makeText(this, "Incremented counter to $clickCount", Toast.LENGTH_SHORT).show()
        }

        resetButton.setOnClickListener {
            clickCount = 0
            titleTextView.text = "Welcome to Everything4Droid!"
            Toast.makeText(this, "Counter Reset", Toast.LENGTH_SHORT).show()
        }
    }
}`
                                },
                                {
                                  name: "MainViewModel.kt",
                                  path: "app/src/main/java/com/example/droidapp/MainViewModel.kt",
                                  type: "file",
                                  content: `package com.example.droidapp

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class MainViewModel : ViewModel() {
    private val _count = MutableStateFlow(0)
    val count: StateFlow<Int> = _count

    fun increment() {
        _count.value++
    }

    fun reset() {
        _count.value = 0
    }
}`
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  name: "res",
                  path: "app/src/main/res",
                  type: "directory",
                  children: [
                    {
                      name: "layout",
                      path: "app/src/main/res/layout",
                      type: "directory",
                      children: [
                        {
                          name: "activity_main.xml",
                          path: "app/src/main/res/layout/activity_main.xml",
                          type: "file",
                          content: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="24dp"
    android:gravity="center_horizontal"
    android:background="#1E293B">

    <ImageView
        android:id="@+id/logoImage"
        android:layout_width="80dp"
        android:layout_height="80dp"
        android:layout_marginBottom="16dp"
        android:src="@drawable/ic_android" />

    <TextView
        android:id="@+id/titleTextView"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Welcome to Everything4Droid!"
        android:textColor="#F8FAFC"
        android:textSize="22sp"
        android:textStyle="bold"
        android:layout_marginBottom="8dp" />

    <TextView
        android:id="@+id/subtitleTextView"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Build, debug & deploy Android apps directly in your browser."
        android:textColor="#94A3B8"
        android:textSize="14sp"
        android:layout_marginBottom="32dp"
        android:gravity="center" />

    <EditText
        android:id="@+id/nameInput"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Enter your developer name"
        android:textColorHint="#64748B"
        android:textColor="#F8FAFC"
        android:layout_marginBottom="16dp" />

    <Button
        android:id="@+id/clickButton"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Tap to Increment Counter"
        android:background="#10B981"
        android:textColor="#FFFFFF"
        android:layout_marginBottom="12dp" />

    <Button
        android:id="@+id/resetButton"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Reset Counter"
        android:background="#EF4444"
        android:textColor="#FFFFFF" />

</LinearLayout>`
                        }
                      ]
                    },
                    {
                      name: "values",
                      path: "app/src/main/res/values",
                      type: "directory",
                      children: [
                        {
                          name: "colors.xml",
                          path: "app/src/main/res/values/colors.xml",
                          type: "file",
                          content: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="purple_200">#FFBB86FC</color>
    <color name="purple_500">#FF6200EE</color>
    <color name="teal_200">#FF03DAC5</color>
    <color name="teal_700">#FF018786</color>
    <color name="black">#FF000000</color>
    <color name="white">#FFFFFFFF</color>
</resources>`
                        },
                        {
                          name: "strings.xml",
                          path: "app/src/main/res/values/strings.xml",
                          type: "file",
                          content: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Everything4DroidApp</string>
    <string name="welcome_message">Welcome to the Droid Compiler</string>
</resources>`
                        }
                      ]
                    }
                  ]
                },
                {
                  name: "AndroidManifest.xml",
                  path: "app/src/main/AndroidManifest.xml",
                  type: "file",
                  content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.droidapp">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Everything4DroidApp">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`
                }
              ]
            }
          ]
        },
        {
          name: "build.gradle",
          path: "app/build.gradle",
          type: "file",
          content: `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.example.droidapp'
    compileSdk 34

    defaultConfig {
        applicationId "com.example.droidapp"
        minSdk 26
        targetSdk 34
        versionCode 1
        versionName "1.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = '17'
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0'
    
    testImplementation 'junit:junit:4.13.2'
    androidTestImplementation 'androidx.test.ext:junit:1.1.5'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.5.1'
}`
        }
      ]
    },
    {
      name: "build.gradle",
      path: "build.gradle",
      type: "file",
      content: `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    id 'com.android.application' version '8.2.2' apply false
    id 'com.android.library' version '8.2.2' apply false
    id 'org.jetbrains.kotlin.android' version '1.9.22' apply false
}`
    },
    {
      name: "settings.gradle",
      path: "settings.gradle",
      type: "file",
      content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Everything4DroidApp"
include ':app'`
    },
    {
      name: "gradle.properties",
      path: "gradle.properties",
      type: "file",
      content: `android.useAndroidX=true
android.enableJetifier=true
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8`
    }
  ]
};
