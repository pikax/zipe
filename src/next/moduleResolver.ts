export interface ModuleInformation {
  name: string;

  path: string;

  fullPath: string;

  module: boolean;
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
