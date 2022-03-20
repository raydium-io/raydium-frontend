interface ObjectConstructor {
  keys<T>(o: T): Array<Extract<keyof T, string>> extends string ? Array<Extract<keyof T, string>> : string[]
}
