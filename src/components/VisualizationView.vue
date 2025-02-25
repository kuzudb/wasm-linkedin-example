1<template>
  <div class="visualization-view__wrapper" :style="{ height: containerHeight, width: containerWidth }">
    <div ref="graph" class="visualization-view__graph" :style="{ height: containerHeight, width: containerWidth }" />
  </div>
</template>

<script lang="js">
import Kuzu from '../utils/KuzuWasm';

export default {
  name: "VisualizationView",
  data() {
    return {
      graphData: null,
      colors: {
        Owner: "#76b7b2", // teal
        Company: "#9c755f", // brown
        Skill: "#e58d96", // pink
        Contact: "#d5b441", // yellow
      },
      sizeMap: {
        Owner: 120,
        Company: 60,
        Skill: 60,
        Contact: 60,
      },
      redrawDebounce: null,
      containerHeight: "100%",
      containerWidth: "100%",
    };
  },

  computed: {

  },



  async mounted() {
    const { nodes, rels } = await this.generateGraphData();
    this.nodes = nodes;
    this.rels = rels;
    await this.drawGraph(nodes, rels);
    window.addEventListener("resize", this.redrawGraph);

  },

  beforeUnmount() {
    this.destroyGraph();
    window.removeEventListener("resize", this.redrawGraph);
  },

  methods: {
    getNodeId(node) {
      return `${node._id.table}__${node._id.offset}`
    },

    processNode(node) {
      const id = this.getNodeId(node);
      const type = node._label;
      let label, icon;
      switch (type) {
        case "Owner":
          label = node.firstName + " " + node.lastName;
          icon = {
            face: '"Font Awesome 6 Free"',
            code: "\uf007",
            size: this.sizeMap[type],
            color: this.colors[type],
          };
          break;
        case "Company":
          label = node.name;
          icon = {
            face: '"Font Awesome 6 Free"',
            code: "\uf1ad",
            size: this.sizeMap[type],
            color: this.colors[type],
          };
          break;
        case "Skill":
          label = node.name;
          icon = {
            face: '"Font Awesome 6 Free"',
            code: "\uf0eb",
            size: this.sizeMap[type],
            color: this.colors[type],
          };
          break;
        case "Contact":
          label = node.firstName + " " + node.lastName;
          icon = {
            face: '"Font Awesome 6 Free"',
            code: "\uf007",
            size: this.sizeMap[type],
            color: this.colors[type],
          };
          break;
        default:
          break;
      }
      return {
        id,
        label,
        icon,
        shape: "icon",
        color: this.colors[type],
      };

    },

    async generateGraphData() {
      const queryResult = await Kuzu.query("MATCH (n)-[r]->(m) RETURN n, r, m");
      let data = queryResult.rows;
      const addedNodes = new Set();

      // create an array with nodes
      const nodes = [];
      const rels = [];
      for (let i = 0; i < data.length; ++i) {
        const source = data[i].n;
        const edge = data[i].r;
        const target = data[i].m;

        let sourceNode = this.processNode(source);
        let targetNode = this.processNode(target);
        if (!addedNodes.has(sourceNode.id)) {
          nodes.push(sourceNode);
          addedNodes.add(sourceNode.id);
        }
        if (!addedNodes.has(targetNode.id)) {
          nodes.push(targetNode);
          addedNodes.add(targetNode.id);
        }
        // Skip messages to avoid clutter
        if (edge._label === "Messages") {
          continue;
        }
        rels.push({
          from: sourceNode.id,
          to: targetNode.id,
          label: edge._label,
        });
      }
      return { nodes, rels };
    },

    async drawGraph(nodes, rels) {
      this.destroyGraph();
      this.refreshContainerSize();
      const nodesDataset = new vis.DataSet(nodes);
      const edgesDataset = new vis.DataSet(rels);

      if (document.fonts) {
        await document.fonts.load('1em "Font Awesome 6 Free"');
      }

      const container = this.$refs.graph;
      const data = {
        nodes: nodesDataset,
        edges: edgesDataset,
      };
      const options = {
        layout: {
          improvedLayout: false, // Disabling this speeds up performance
        },
        physics: {
          solver: "forceAtlas2Based",
          forceAtlas2Based: {
            gravitationalConstant: -100, // Stronger repulsion (spreads nodes out)
            centralGravity: 0.003, // Weaker pull to center
            springLength: 200, // More spacing between nodes
            springConstant: 0.04, // Slightly looser connections
            damping: 0.4, // Reduce jitter
            avoidOverlap: 1, // Prevent overlapping nodes
          },
          stabilization: {
            iterations: 200, // Allow graph to stabilize
          },
        },
        edges: {
          arrows: { to: { enabled: true, scaleFactor: 0.5 } }, // Smaller arrows
          color: { opacity: 0.6 }, // Transparent edges
        },
        nodes: {
          shape: "icon",
        },
      };

      const network = new vis.Network(container, data, options);
      network.on("stabilizationIterationsDone", () => {
        network.setOptions({ physics: { enabled: false } });
      });
      window.network = network;
    },

    destroyGraph() {
      if (window.network) {
        window.network.destroy();
      }
    },

    refreshContainerSize() {
      this.containerHeight = window.innerHeight + "px";
      this.containerWidth = window.innerWidth - 500 + "px";
    },

    redrawGraph() {
      if (!this.nodes || !this.rels) {
        return;
      }
      if (this.redrawDebounce) {
        clearTimeout(this.redrawDebounce);
      }
      this.redrawDebounce = setTimeout(() => {
        this.destroyGraph();
        this.drawGraph(this.nodes, this.rels);
      }, 300);
    },
  },
};

</script>

<style lang="scss" scoped>
.visualization-view__wrapper {
  display: flex;
  height: 100%;
  width: 100%;
}

.visualization-view__graph {
  height: 100%;
  width: 100%;
}
</style>
