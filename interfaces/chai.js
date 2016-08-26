declare module 'chai' {
  declare type LanguageChain = {
    to: ChaiAssertion,
    deep: ChaiAssertion,
    be: ChaiAssertion,
    an: ChaiAssertion,
    itself: ChaiAssertion,
    have: ChaiAssertion
  }

  declare type ChaiAssertion = LanguageChain & {
    ok: void,
    false: void,
    true: void,
    equal: (value: mixed, message?: string) => void,
    respondTo: (method: string, message?: string) => void,
    instanceOf: (type: any, message?: string) => void,
    property: (property: string, value: any) => void
  }

  declare var exports: {
    expect: (target: mixed, message: ?string) => ChaiAssertion;
  }
}
