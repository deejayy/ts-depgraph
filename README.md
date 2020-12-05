# Typescript (Angular) Dependency Graph drawer

Uses vis.js, check it out, it's pretty cool.

# Usage

## First, customize ```config.js```.

```projectDirectory```: this is the directory where your ```src``` directory is. Without trailing slash.  
```tsconfig```: if you have path aliases defined in tsconfig, you can refer it here. Otherwise ```projectDirectory/tsconfig.json``` is used.  

## Run graph generator

```bash
node "graph.js" > dep-graph.js 
```

## Open index.html

![](screenshot/shot-01.png)
