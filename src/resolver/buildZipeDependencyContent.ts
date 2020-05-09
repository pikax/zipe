import { ZipeDependency, DependencyPointer } from "./resolveZipeDependency";

export function buildZipDependencyContent(
  item: ZipeDependency,
  processed: Map<string, ZipeDependency>,
  externals: Map<string, DependencyPointer>,
  externalAsArguments: boolean = false
): string {
  let code = "\n\n// Zipe code begin";

  // aka server
  if (externalAsArguments) {
    code += `\n function updateStyle(){}`;
  }

  // add init
  code += "\nlet _ZIPE_APP___\n";

  // external
  for (const [key, val] of externals) {
    console.log("dependency", key, val);

    if (externalAsArguments) {
      // nothing
    } else {
      // TODO remove replace
      // code += `\nimport * as ${key} from '${val.module.replace(
      //   "/@modules/",
      //   ""
      // )}'`;
      code += `\nimport * as ${key} from '${val.module}'`;
    }
  }
  // open block
  code += "\n{";

  const modulesProcessed = new Set<string>();

  const fileDependency = {
    module: item.relativePath,
  } as any;

  for (const module of treeDependencyToCode(fileDependency, processed)) {
    if (modulesProcessed.has(module)) {
      continue;
    }

    const fileItem = processed.get(module)!;

    code += `\n\n// Module ${fileItem.relativePath}`;

    code += `\n${fileItem.content}`;

    modulesProcessed.add(module);
  }

  // expose zipe_app
  code += `\n_ZIPE_APP___ = ${item.varName}`;

  // close block
  code += "\n}";

  // renderApp
  if (externalAsArguments) {
    code += `\n return _ZIPE_APP___`;
  }

  code += "\n\n// Zipe code end";

  return code;
}

// Depth first
export function treeDependencyToCode(
  dep: DependencyPointer,
  processed: Map<string, ZipeDependency>
) {
  let deps: string[] = [];

  for (const d of processed.get(dep.module)!.dependencies) {
    const x = treeDependencyToCode(d, processed);
    deps.push(...x);
  }

  deps.push(dep.module);
  return deps;
}
