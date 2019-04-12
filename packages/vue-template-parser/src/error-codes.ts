export enum ParserErrorCode {
  /**
   * Named character reference (e.g. &amp; for &) is not registered.
   *
   * @see https://html.spec.whatwg.org/multipage/named-characters.html#named-character-references
   */
  UNKNOWN_NAMED_CHARACTER_REFERENCE,
  /**
   * Character \0 found in template text.
   */
  NULL_CHARACTER_REFERENCE,
  /**
   * Invalid numeric character reference (e.g. &#xffff;)
   * @see https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
   */
  OUTSIDE_UNICODE_RANGE_CHARACTER_REFERENCE,
  /**
   * Restricted numeric character reference range.
   *
   * @see https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
   */
  SURROGATE_CHARACTER_REFERENCE,
  /**
   * Non-printable numeric character reference.
   *
   * @see https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
   */
  NONCHARACTER_CHARACTER_REFERENCE,
  /**
   * Control character numeric character reference.
   *
   * @see https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
   */
  CONTROL_CHARACTER_REFERENCE,
  /**
   * Missing trailing semicolon in named/numeric character reference. (e.g. &amp instead of &amp;)
   */
  MISSING_SEMICOLON_CHARACTER_REFERENCE,
  EOF_IN_INTERPOLATION,
  EOF_IN_COMMENT,
  EOF_IN_CDATA,
  EOF_BEFORE_TAG_NAME,
  EOF_IN_CLOSING_TAG,
  EOF_IN_ATTRIBUTE,
  EOF_IN_DIRECTIVE,
  ABRUPT_CLOSING_OF_EMPTY_COMMENT,
  INCORRECTLY_CLOSED_COMMENT,
  MISSING_END_TAG_NAME,
  INVALID_FIRST_CHARACTER_IN_TAG_NAME,
  UNEXPECTED_SOLIDUS_IN_TAG,
  DUPLICATE_ATTRIBUTE,
  UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE,
  UNEXPECTED_END_TAG,
  ILLEGAL_DIRECTIVE_MODIFIER
}
