import CucumberExpressionError from './CucumberExpressionError.js'

const ILLEGAL_PARAMETER_NAME_PATTERN = /([[\]()$.|?*+])/
const UNESCAPE_PATTERN = () => /(\\([[$.|?*+\]]))/g

interface Constructor<T> extends Function {
  new (...args: unknown[]): T
  prototype: T
}

type Factory<T> = (...args: unknown[]) => T

export type RegExps = StringOrRegExp | readonly StringOrRegExp[]

export type StringOrRegExp = string | RegExp

export default class ParameterType<T> {
  private transformFn: (...match: readonly string[]) => T | PromiseLike<T>

  public static compare(pt1: ParameterType<unknown>, pt2: ParameterType<unknown>) {
    if (pt1.preferForRegexpMatch && !pt2.preferForRegexpMatch) {
      return -1
    }
    if (pt2.preferForRegexpMatch && !pt1.preferForRegexpMatch) {
      return 1
    }
    return (pt1.name || '').localeCompare(pt2.name || '')
  }

  public static checkParameterTypeName(typeName: string) {
    if (!this.isValidParameterTypeName(typeName)) {
      throw new CucumberExpressionError(
        `Illegal character in parameter name {${typeName}}. Parameter names may not contain '{', '}', '(', ')', '\\' or '/'`
      )
    }
  }

  public static isValidParameterTypeName(typeName: string) {
    const unescapedTypeName = typeName.replace(UNESCAPE_PATTERN(), '$2')
    return !unescapedTypeName.match(ILLEGAL_PARAMETER_NAME_PATTERN)
  }

  public regexpStrings: readonly string[]

  /**
   * @param name {String} the name of the type
   * @param regexps {Array.<RegExp | String>,RegExp,String} that matche the type
   * @param type {Function} the prototype (constructor) of the type. May be null.
   * @param transform {Function} function transforming string to another type. May be null.
   * @param useForSnippets {boolean} true if this should be used for snippets. Defaults to true.
   * @param preferForRegexpMatch {boolean} true if this is a preferential type. Defaults to false.
   * @param builtin whether or not this is a built-in type
   */
  constructor(
    public readonly name: string | undefined,
    regexps: RegExps,
    public readonly type: Constructor<T> | Factory<T> | null,
    transform?: (...match: string[]) => T | PromiseLike<T>,
    public readonly useForSnippets?: boolean,
    public readonly preferForRegexpMatch?: boolean,
    public readonly builtin?: boolean
  ) {
    if (transform === undefined) {
      transform = (s) => s as unknown as T
    }
    if (useForSnippets === undefined) {
      this.useForSnippets = true
    }
    if (preferForRegexpMatch === undefined) {
      this.preferForRegexpMatch = false
    }

    if (name) {
      ParameterType.checkParameterTypeName(name)
    }

    this.regexpStrings = stringArray(regexps)
    this.transformFn = transform
  }

  public transform(thisObj: unknown, groupValues: string[] | null) {
    return this.transformFn.apply(thisObj, groupValues)
  }
}

function stringArray(regexps: RegExps): string[] {
  const array: StringOrRegExp[] = Array.isArray(regexps) ? regexps : [regexps]
  return array.map((r) => (r instanceof RegExp ? regexpSource(r) : r))
}

function regexpSource(regexp: RegExp): string {
  const flags = regexpFlags(regexp)

  for (const flag of ['g', 'i', 'm', 'y']) {
    if (flags.indexOf(flag) !== -1) {
      throw new CucumberExpressionError(`ParameterType Regexps can't use flag '${flag}'`)
    }
  }
  return regexp.source
}

// Backport RegExp.flags for Node 4.x
// https://github.com/nodejs/node/issues/8390
function regexpFlags(regexp: RegExp) {
  let flags = regexp.flags
  if (flags === undefined) {
    flags = ''
    if (regexp.ignoreCase) {
      flags += 'i'
    }
    if (regexp.global) {
      flags += 'g'
    }
    if (regexp.multiline) {
      flags += 'm'
    }
  }
  return flags
}
