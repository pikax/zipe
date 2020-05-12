import { parse } from "@vue/compiler-sfc";
import * as sfcCompiler from "@vue/compiler-sfc";
import { resolveVue } from "vite/dist/utils";

export type SFCCompiler = typeof sfcCompiler;
export type SFCParseResult = ReturnType<typeof parse>;

export const filePathToVar = (p: string) =>
  "__" + p.replace(/[^0-9a-zA-Z_$]/g, "_");
export const externalToVar = (p: string) => "_" + filePathToVar(p) + "_";

export function resolveCompiler(cwd: string): typeof sfcCompiler {
  // TODO change to the line bellow
  return require(resolveVue(cwd).compiler);
  // return sfcCompiler;
}

export function escapeRegExp(s) {
  return s.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export function stringToRegex(s: string, flags?: string | undefined) {
  return new RegExp(escapeRegExp(s), flags);
}

export function replaceAll(
  s: string,
  search: string,
  replaceValue: string,
  flags?: undefined
): string {
  return s.replace(
    stringToRegex(search, flags ? flags + "g" : "g"),
    replaceValue
  );
}
