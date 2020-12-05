var fs = require("fs");
var fspath = require("path");

const sourceDirectory = "W:/missster/mst5";
//const sourceDirectory = "testdir";
const sourceDirectoryRegex = new RegExp(`${sourceDirectory}/src/`);

const includePattern = new RegExp(".ts$");
const excludePattern = new RegExp(".spec.ts$");

function getFileList(path) {
  const getSourceFiles = (files) =>
    files
      .filter((file) => file.isFile())
      .filter((file) => file.name.match(includePattern))
      .filter((file) => !file.name.match(excludePattern));

  const getDirectories = (files) => files.filter((file) => file.isDirectory());

  const files = fs.readdirSync(path, { withFileTypes: true });
  const fileList = getSourceFiles(files).map((file) =>
    fspath.normalize(`${path}/${file.name}`)
  );
  getDirectories(files)
    .map((subDir) => getFileList(`${path}/${subDir.name}`))
    .map((dirFiles) => dirFiles.forEach((file) => fileList.push(file)));

  return [...fileList];
}

function getTsConfigPaths(path) {
  const tsconfig = require(`${path}/tsconfig.json`);
  const paths = tsconfig.compilerOptions.paths;
  const mapping = {};

  Object.keys(paths).map((alias) => {
    const pattern = alias.replace(/\*$/, "");
    const replacement = paths[alias];
    mapping[pattern] = replacement[0].replace(/\*$/, "");
  });

  return mapping;
}

const aliasMapping = getTsConfigPaths(sourceDirectory);
const fileList = getFileList(`${sourceDirectory}/src`);

function getImports(file) {
  const content = fs
    .readFileSync(file, { encoding: "UTF-8" })
    .replace(/[\r\n]/gi, " ");
  const nodes = content.match(/import\s+.*?\s+from\s+.*?;/gim) || [];
  // const inlineImports = content.match(/import\((.*?)\).*/);
  // import('./landing.module').then((m) => m.LandingModule),
  return nodes;
}

function resolveAlias(path) {
  const foundPattern = Object.keys(aliasMapping)
    .map((alias) => {
      const regex = new RegExp(`^${alias}`);
      if (regex.test(path)) {
        return { regex, replacement: aliasMapping[alias] };
      }
    })
    .filter(Boolean);
  return foundPattern.length > 0
    ? path.replace(foundPattern[0].regex, foundPattern[0].replacement)
    : path;
}

function normalizImportPath(path, origin) {
  const currentDir = fspath.dirname(origin);
  const resolved = resolveAlias(path);
  let absolutePath;
  if (path !== resolved) {
    absolutePath = fspath.normalize(`${sourceDirectory}/${resolved}`);
  } else {
    absolutePath = fspath.normalize(`${currentDir}/${path}`);
  }
  if (!(fs.existsSync(absolutePath) || fs.existsSync(absolutePath + ".ts"))) {
    absolutePath = path;
  }
  return absolutePath;
}

function parseImport(imp, path) {
  const data = imp.match(/import\b(.*?)\bfrom\b['" ]*(.*?)['" ]*;/);
  return {
    to: fspath.normalize(path),
    imports: data[1]
      .replace(/[\{\}]/g, "")
      .split(/,/)
      .map((v) => v.trim()),
    from: normalizImportPath(data[2], path),
  };
}

function getNodeColor(path) {
  if (path.match(/module$/)) {
    return '#ffcfcf';
  }
  if (path.match(/component$/)) {
    return '#cfffcf';
  }
  if (path.match(/service$/)) {
    return '#ffcfff';
  }
  if (path.match(/(effects?|selectors?|actions?|reducers?|state|facade)$/)) {
    return '#cfcfcf';
  }

  return undefined;
}

function createNodes(graph) {
  const nodes = {};
  graph.forEach((node) => {
    nodes[node.to] = {
      id: node.to,
      label: `*${fspath.basename(node.to)}*\n${fspath.dirname(node.to)}`,
      shape: "box",
      color: getNodeColor(node.to),
      font: { multi: "md", size: 14 },
    };
    nodes[node.from] = {
      id: node.from,
      label: `*${fspath.basename(node.from)}*\n${fspath.dirname(node.from)}`,
      shape: "box",
      color: getNodeColor(node.from),
      font: { multi: "md", size: 14 },
    };
  });
  return Object.values(nodes);
}

function createEdges(graph) {
  const edges = [];
  graph.forEach((node) => {
    edges.push({
      to: node.to,
      from: node.from,
      arrows: "from",
      label: node.imports.join("\n"),
      font: { align: "horizontal" },
    });
  });
  return edges;
}

function clearPath(path) {
  return path.replace(/\.ts$/, "").replace(sourceDirectoryRegex, "");
}

function filterFile(path) {
  return sourceDirectoryRegex.test(path);
}

const graph = fileList
  .map((fileName) =>
    getImports(fileName).map((imp) => parseImport(imp, fileName))
  )
  .reduce((acc, curr) => [...acc, ...curr], [])
  .map((node) => ({
    from: node.from.replace(/\\/g, "/"),
    to: node.to.replace(/\\/g, "/"),
    imports: node.imports,
  }))
  .filter((node) => filterFile(node.from))
  .map((node) => ({
    from: clearPath(node.from),
    to: clearPath(node.to),
    imports: node.imports,
  }));

const nodes = createNodes(graph);
const edges = createEdges(graph);

console.log("const nodes = ", JSON.stringify(nodes), ';');
console.log("const edges = ", JSON.stringify(edges), ';');
