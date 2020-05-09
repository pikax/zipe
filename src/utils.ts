import { parse } from "@vue/compiler-sfc";
import * as sfcCompiler from "@vue/compiler-sfc";

export type SFCParseResult = ReturnType<typeof parse>;

export const filePathToVar = (p: string) =>
  "__" + p.replace(/[^0-9a-zA-Z_$]/g, "_");
export const externalToVar = (p: string) => "_" + filePathToVar(p) + "_";

export function resolveCompiler(cwd: string): typeof sfcCompiler {
  // TODO change to the line bellow
  // return require(resolveVue(cwd).compiler);
  return sfcCompiler;
}
