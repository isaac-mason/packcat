# CHANGELOG

## 0.0.6

- feat: remove the need for `as const` in tuple schema usage
    - before: `tuple([uint16(), string(), varuint()] as const)`
    - after:  `tuple([uint16(), string(), varuint()])`

## 0.01 - 0.0.5

- Early development releases, use at your own risk!