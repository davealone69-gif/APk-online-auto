import { AndroidLayoutElement } from "../types";

/**
 * A robust, client-side Android Layout XML Parser
 * It parses standard Android layout attributes into react-compliant properties using the native DOMParser
 */
export function parseAndroidLayoutXML(xmlString: string): AndroidLayoutElement | null {
  try {
    if (!xmlString || !xmlString.trim()) return null;
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "text/xml");
    
    const parserError = doc.getElementsByTagName("parsererror");
    if (parserError.length > 0) {
      console.warn("XML parser error", parserError[0].textContent);
      // We'll still try to parse what we can or just return null
      return null;
    }

    const parseNode = (node: Element): AndroidLayoutElement => {
      const element: AndroidLayoutElement = {
        type: node.tagName,
        children: []
      };

      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        const shortKey = attr.name.includes(":") ? attr.name.split(":")[1] : attr.name;
        const val = attr.value;

        if (shortKey === "id") {
          element.id = val.replace("@+id/", "").replace("@id/", "");
        } else if (shortKey === "text") {
          element.text = val.startsWith("@string/") ? `[${val.replace("@string/", "")}]` : val;
        } else if (shortKey === "background") {
          element.background = val;
        } else if (shortKey === "textColor") {
          element.textColor = val;
        } else if (shortKey === "padding") {
          element.padding = val;
        } else if (shortKey === "layout_margin" || shortKey === "layout_marginBottom") {
          element.margin = val;
        }
      }

      for (let i = 0; i < node.children.length; i++) {
        element.children?.push(parseNode(node.children[i]));
      }

      return element;
    };

    if (doc.documentElement) {
      return parseNode(doc.documentElement);
    }
    return null;
  } catch (error) {
    console.error("Error parsing layout XML:", error);
    return null;
  }
}

/**
 * Standard colors from XML values or hex fallback
 */
export function resolveAndroidColor(colorStr: string | undefined, defaultColor: string): string {
  if (!colorStr) return defaultColor;
  if (colorStr.startsWith("#")) return colorStr;
  if (colorStr === "@color/white") return "#FFFFFF";
  if (colorStr === "@color/black") return "#000000";
  if (colorStr === "@color/purple_200") return "#C084FC";
  if (colorStr === "@color/purple_500") return "#8B5CF6";
  if (colorStr === "@color/teal_200") return "#2DD4BF";
  if (colorStr === "@color/teal_700") return "#0F766E";
  return defaultColor;
}
