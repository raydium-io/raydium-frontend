import { UseBoundStore } from 'zustand'

export type MayArray<T> = T | Array<T>

export type MayDeepArray<T> = T | Array<MayDeepArray<T>>

export type MayFunction<T, PS extends any[] = []> = T | ((...Params: PS) => T)

export type ArrayItem<T extends ReadonlyArray<any>> = T extends Array<infer P> ? P : never

export type ZustandStore<T extends UseBoundStore<any>> = T extends UseBoundStore<infer R> ? R : never

export type ExactPartial<T, U> = {
  [P in Extract<keyof T, U>]?: T[P]
} & {
  [P in Exclude<keyof T, U>]: T[P]
}

export type ExactRequired<T, U> = {
  [P in Extract<keyof T, U>]-?: T[P]
} & {
  [P in Exclude<keyof T, U>]: T[P]
}

/**
 * extract only string and number
 */
export type SKeyof<O> = Extract<keyof O, string>
