export interface ModuleInformation {
  name: string;

  path: string;

  fullPath: string;

  /**
   * 0 = local file
   * 1 = modules under node_modules
   * 2 = web module
   */
  module: 0 | 1 | 2;
}

export interface ModuleResolver {
  info(module: string, importer: string): Promise<ModuleInformation>;

  requestToFile(publicPath: string): string;
  fileToRequest(filePath: string): string;
  alias(id: string): string | undefined;

  readonly root: string;
}

export function buildModuleResolver(opts = {}) {
  // todo
}
