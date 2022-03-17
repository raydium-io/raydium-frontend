declare module '@solana/buffer-layout' {
  export type GetStructureSchema<T extends Structure> = T extends Structure<any, any, infer S> ? S : unknown
  type AnyLayout = Layout<any, any>
  // TODO: P and DecodeSchema should collapse into one. Or it is too confusing
  export class Layout<T = any, P = ''> {
    span: number
    property?: P
    constructor(span: number, property?: P)
    decode(b: Buffer, offset?: number): T
    encode(src: T, b: Buffer, offset?: number): number
    getSpan(b: Buffer, offset?: number): number
    replicate<AP extends string>(name: AP): Layout<T, AP>
  }

  export class Union<UnionSchema extends { [key: string]: any } = any> extends Layout {
    registry: Record<string, unknown>
    /**@override */
    constructor(discr: AnyLayout, defaultLayout: AnyLayout, property?: string)
    decode(b: Buffer, offset?: number): Partial<UnionSchema>
    addVariant(
      variant: number,
      layout: Structure<any, any, Partial<UnionSchema>> | Layout<any, keyof UnionSchema>,
      property?: string
    ): any /* TEMP: code in Layout.js 1809 */
  }

  export class BitStructure<T = unknown /* TEMP */, P = ''> extends Layout<T, P> {
    /* TODO */
  }

  export class UInt<T = any, P = ''> extends Layout<T, P> {}

  // TODO: remove any.
  export class Structure<T = any, P = '', DecodeSchema extends { [key: string]: any } = any> extends Layout<
    DecodeSchema,
    P
  > {
    span: number
    constructor(fields: T, property?: P, decodePrefixes?: boolean)
    /**@override */
    // @ts-expect-error structure's decode is special
    decode(b: Buffer, offset?: number): DecodeSchema
    layoutFor<AP extends string>(property: AP): Layout<DecodeSchema[AP]>
    offsetOf<AP extends string>(property: AP): number
  }

  export class Blob<P extends string = ''> extends Layout<Buffer, P> {}

  export function greedy<P extends string = ''>(elementSpan?: number, property?: P): Layout<number, P>
  export function u8<P extends string = ''>(property?: P): Layout<number, P>
  export function u16<P extends string = ''>(property?: P): Layout<number, P>
  export function u24<P extends string = ''>(property?: P): Layout<number, P>
  export function u32<P extends string = ''>(property?: P): Layout<number, P>
  export function u40<P extends string = ''>(property?: P): Layout<number, P>
  export function u48<P extends string = ''>(property?: P): Layout<number, P>
  export function nu64<P extends string = ''>(property?: P): Layout<number, P>
  export function u16be<P extends string = ''>(property?: P): Layout<number, P>
  export function u24be<P extends string = ''>(property?: P): Layout<number, P>
  export function u32be<P extends string = ''>(property?: P): Layout<number, P>
  export function u40be<P extends string = ''>(property?: P): Layout<number, P>
  export function u48be<P extends string = ''>(property?: P): Layout<number, P>
  export function nu64be<P extends string = ''>(property?: P): Layout<number, P>
  export function s8<P extends string = ''>(property?: P): Layout<number, P>
  export function s16<P extends string = ''>(property?: P): Layout<number, P>
  export function s24<P extends string = ''>(property?: P): Layout<number, P>
  export function s32<P extends string = ''>(property?: P): Layout<number, P>
  export function s40<P extends string = ''>(property?: P): Layout<number, P>
  export function s48<P extends string = ''>(property?: P): Layout<number, P>
  export function ns64<P extends string = ''>(property?: P): Layout<number, P>
  export function s16be<P extends string = ''>(property?: P): Layout<number, P>
  export function s24be<P extends string = ''>(property?: P): Layout<number, P>
  export function s32be<P extends string = ''>(property?: P): Layout<number, P>
  export function s40be<P extends string = ''>(property?: P): Layout<number, P>
  export function s48be<P extends string = ''>(property?: P): Layout<number, P>
  export function ns64be<P extends string = ''>(property?: P): Layout<number, P>
  export function f32<P extends string = ''>(property?: P): Layout<number, P>
  export function f32be<P extends string = ''>(property?: P): Layout<number, P>
  export function f64<P extends string = ''>(property?: P): Layout<number, P>
  export function f64be<P extends string = ''>(property?: P): Layout<number, P>
  export function struct<T, P extends string = ''>(
    fields: T,
    property?: P,
    decodePrefixes?: boolean
  ): T extends Layout<infer Value, infer Property>[]
    ? Structure<
        Value,
        P,
        {
          [K in Exclude<Extract<Property, string>, ''>]: Extract<T[number], Layout<any, K>> extends Layout<infer V, any>
            ? V
            : any
        }
      >
    : any

  export class Sequence<T> extends Layout<T> {
    elementLayout: Layout<T>
    count: number
  }
  export function seq<T, P>(
    elementLayout: Layout<T, string>,
    count: number | Layout<number, string>,
    property?: P
  ): Layout<T[]>

  export function union<UnionSchema extends { [key: string]: any } = any>(
    discr: AnyLayout,
    defaultLayout?: any,
    property?: string
  ): Union<UnionSchema>
  export function unionLayoutDiscriminator<P extends string = ''>(layout: Layout<any, P>, property?: P): any
  export function blob<P extends string = ''>(length: number | Layout<number, P>, property?: P): Blob<P>
  export function cstr<P extends string = ''>(property?: P): Layout<string, P>
  export function utf8<P extends string = ''>(maxSpan: number, property?: P): Layout<string, P>
  export function bits<T, P extends string = ''>(word: Layout<T>, msb?: boolean, property?: P): BitStructure<T, P> // TODO: not sure

  export class OffsetLayout<T, P extends string> extends Layout<T, P> {}
  export function offset<T, P extends string = ''>(layout: Layout<T, P>, offset?: number, property?: P): Layout<T, P>
}
