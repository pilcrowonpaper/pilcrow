import type { Root, RootContent, Element as HastElementInstance, ElementContent as HastElementContent } from "hast";

class HastElement implements HastElementInstance {
	public readonly type = "element";
	public children;
	public tagName;
	public properties;
	constructor(
		tagName: string,
		options: {
			properties?: Record<any, boolean | number | string | null | undefined | Array<string | number>>;
			children?: HastElementContent[];
		}
	) {
		this.tagName = tagName;
		this.children = options.children ?? [];
		this.properties = options.properties ?? {};
	}
}

const wrapTableElement = async (content: Root) => {
	const tableChildren = content.children
		.map((child, i) => {
			return [child, i] as const;
		})
		.filter(([child]) => child.type === "element" && child.tagName === "table");
	for (const [tableChild, position] of tableChildren) {
		if (tableChild.type !== "element") continue;
		const wrapperDivElement = new HastElement("div", {
			properties: {
				class: "table-wrapper"
			},
			children: [tableChild]
		});
		content.children[position] = wrapperDivElement;
	}
};

const parseContent = async (content: Root | RootContent) => {
	if (content.type !== "element" && content.type !== "root") return;
	if (content.type === "root") {
		wrapTableElement(content);
	}
	await Promise.all(content.children.map((children) => parseContent(children)));
};

const rehypePlugin = async (root: Root) => {
	await parseContent(root);
};

export default () => {
	const initializePlugin = () => rehypePlugin;
	return initializePlugin;
};
