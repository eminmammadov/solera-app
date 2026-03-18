export interface DocSection {
  id: string;
  title: string;
  content: string[];
}

export interface DocPage {
  slug: string;
  title: string;
  sections: DocSection[];
}

export interface DocCategory {
  title: string;
  icon: "Rocket" | "Cpu" | "Shield" | "Code";
  items: DocPage[];
}
