# Understand-Anything

Transform codebases into interactive knowledge graphs with AI-powered analysis.

> "The goal isn't a graph that wows you with how complex your codebase is — it's a graph that quietly teaches you how every piece fits together."

## 🎯 Features

### 1. Graph Visualization
- **Interactive navigation** through knowledge graphs
- **Node details** on click - functions, classes, files
- **Layer visualization** - API, Service, Data, UI, Utility
- **Force-directed layouts** with React Flow

### 2. Multi-Agent Pipeline
Seven specialized agents work together:
- **Project Scanner** - Discovers files and detects languages
- **File Analyzer** - Extracts functions, classes, imports
- **Architecture Analyzer** - Identifies layers and patterns
- **Tour Builder** - Generates guided onboarding tours
- **Graph Reviewer** - Validates graph quality
- **Domain Analyzer** - Extracts business domains
- **Article Analyzer** - Analyzes wiki/documentation

### 3. Tree-sitter + LLM Hybrid
Combines deterministic parsing with semantic understanding:
- **Tree-sitter** - Fast, accurate AST parsing
- **LLM Enhancement** - Plain-English summaries, tags
- **17+ Languages** supported

### 4. Smart Analysis
- **Incremental updates** - Only re-analyze changed files
- **Parallel processing** - Up to 5 concurrent file analyzers
- **Fuzzy search** with Fuse.js
- **Cross-references** and call graphs

### 5. Dashboard
- **React Flow** for graph visualization
- **Layer filtering** by architectural layer
- **Fuzzy search** across all nodes
- **Guided tours** for onboarding
- **Dark mode** support

### 6. Knowledge Base Analysis
- **Wiki/Documentation parsing**
- **Entity extraction**
- **Concept mapping**
- **Cross-article linking**

## 📦 Packages

```
understand-anything/
├── packages/
│   ├── core/           # Tree-sitter + LLM analysis engine
│   ├── agents/         # Multi-agent pipeline
│   └── dashboard/      # React dashboard with React Flow
├── scripts/
│   └── cli.ts          # Command-line interface
└── tests/
```

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/antono4/Understand-Anything.git
cd Understand-Anything

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### CLI Usage

```bash
# Analyze a codebase
pnpm cli analyze ./my-project -o knowledge-graph.json

# Search the knowledge graph
pnpm cli search knowledge-graph.json "authentication"

# Generate guided tours
pnpm cli tour knowledge-graph.json -o tour.json

# Review graph quality
pnpm cli review knowledge-graph.json

# Analyze business domains
pnpm cli domains knowledge-graph.json

# Analyze wiki/documentation
pnpm cli wiki ./docs -o knowledge-base.json

# Start the dashboard
pnpm cli dashboard knowledge-graph.json -p 3000
```

### Dashboard

```bash
# Start dashboard development server
pnpm dev:dashboard
```

## 🔧 Development

### Prerequisites
- Node.js >= 22
- pnpm >= 10

### Build

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @understand-anything/core build
pnpm --filter @understand-anything/agents build
pnpm --filter @understand-anything/dashboard build
```

### Test

```bash
pnpm test
```

## 📚 Architecture

### Core Package (`@understand-anything/core`)
- Tree-sitter parsers for 17+ languages
- Knowledge graph data structures
- Fuse.js fuzzy search
- Zod schema validation

### Agents Package (`@understand-anything/agents`)
- Base agent interface
- Pipeline executor
- 7 specialized analysis agents
- LLM integration

### Dashboard Package (`@understand-anything/dashboard`)
- React 19 + TypeScript
- React Flow for graph visualization
- Zustand state management
- TailwindCSS v4

## 🌐 Supported Languages

- JavaScript / TypeScript
- Python
- Go
- Rust
- Java
- C / C++ / C#
- PHP
- Ruby
- JSON / YAML
- Markdown
- HTML / CSS

## 📖 Documentation

- [Core Package](packages/core/README.md)
- [Agents Package](packages/agents/README.md)
- [Dashboard Package](packages/dashboard/README.md)
- [CLI Usage](scripts/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- [Homepage](https://understand-anything.com/)
- [Live Demo](https://understand-anything.com/demo/)
- [Discord](https://discord.gg/pydat66RY)

---

Made with ❤️ for developers who want to understand their codebases.
