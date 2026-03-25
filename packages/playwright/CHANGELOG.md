# Changelog

## [0.2.6](https://github.com/KarinJS/snapka/compare/playwright-v0.2.5...playwright-v0.2.6) (2026-03-25)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @snapka/browser-finder bumped to 0.1.11

## [0.2.5](https://github.com/KarinJS/snapka/compare/playwright-v0.2.4...playwright-v0.2.5) (2026-03-25)


### ♻️ Code Refactoring

* remove custom core packages, use official playwright-core and puppeteer-core ([5a8db3d](https://github.com/KarinJS/snapka/commit/5a8db3dffd2dd555139cb11d2c384d850bf63815))

## [0.2.4](https://github.com/KarinJS/snapka/compare/playwright-v0.2.3...playwright-v0.2.4) (2026-03-25)


### 🐛 Bug Fixes

* ci ([98f778b](https://github.com/KarinJS/snapka/commit/98f778b630cc5e639aae9971110b2da03fdb96ff))
* **playwright:** fix viewport slicing clip out-of-bounds and add @types/debug ([7450f7c](https://github.com/KarinJS/snapka/commit/7450f7c1b7b41470770517fbcd22ce6038cfd7ce))
* viewport slicing fullPage support and browser crash auto-recovery ([8e2d651](https://github.com/KarinJS/snapka/commit/8e2d6512ca2c62b7b572dd782128c1f152ee7b94))


### 🎫 Chores

* simplify package.json exports ([604b6e8](https://github.com/KarinJS/snapka/commit/604b6e81123c42a64583d451dca39305ace07c05))
* 移除coverage ([7ae71b3](https://github.com/KarinJS/snapka/commit/7ae71b307d62f5f05b34bddb84e6b51bc4600a62))


### ♻️ Code Refactoring

* **playwright:** replace console with debug logger ([77529dc](https://github.com/KarinJS/snapka/commit/77529dc5b0815117513a12c51055801d71168025))


### ✅ Tests

* add comprehensive unit and integration tests for puppeteer and playwright ([0048a55](https://github.com/KarinJS/snapka/commit/0048a5526ef32f745b5524dd8eb5329366e188de))
* **puppeteer,playwright:** fix mock objects to match updated source API ([ca8e01e](https://github.com/KarinJS/snapka/commit/ca8e01eeaa5f602aecfbb6980d10341e6162b838))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @snapka/browser-finder bumped to 0.1.10
    * @snapka/browsers bumped to 0.3.0
    * @snapka/playwright-core bumped to 0.1.4
    * @snapka/types bumped to 0.1.4

## [0.2.3](https://github.com/KarinJS/snapka/compare/playwright-v0.2.2...playwright-v0.2.3) (2026-02-23)


### 🐛 Bug Fixes

* chrome-for-testing-public ([22877a4](https://github.com/KarinJS/snapka/commit/22877a4ced64a67be311644ed53321399b0574f8))
* chrome-for-testing-public ([b415de8](https://github.com/KarinJS/snapka/commit/b415de87b81debad4365d2caad1049509e168d35))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @snapka/browser-finder bumped to 0.1.9
    * @snapka/browsers bumped to 0.2.3

## [0.2.2](https://github.com/KarinJS/snapka/compare/playwright-v0.2.1...playwright-v0.2.2) (2026-02-23)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @snapka/browser-finder bumped to 0.1.8
    * @snapka/browsers bumped to 0.2.2

## [0.2.1](https://github.com/KarinJS/snapka/compare/playwright-v0.2.0...playwright-v0.2.1) (2026-02-23)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @snapka/browser-finder bumped to 0.1.7
    * @snapka/browsers bumped to 0.2.1

## [0.2.0](https://github.com/KarinJS/snapka/compare/playwright-v0.1.7...playwright-v0.2.0) (2026-02-23)


### ✨ Features

* mirror probe auto-select, default to aliyun npmmirror ([2b6d130](https://github.com/KarinJS/snapka/commit/2b6d1304ab5d095731c08ea13e5dbfc64a5576ab))


### 🐛 Bug Fixes

* security and logic improvements across all packages ([9394626](https://github.com/KarinJS/snapka/commit/93946268d2031236494c05040efa8d38fb666ca9))
* 修复各包单元测试并更新断言以匹配源码 ([8c343c5](https://github.com/KarinJS/snapka/commit/8c343c57d75800ef6dd6d9a6417b9c19970e89b4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @snapka/browser-finder bumped to 0.1.6
    * @snapka/browsers bumped to 0.2.0
    * @snapka/playwright-core bumped to 0.1.3
    * @snapka/types bumped to 0.1.3

## [0.1.7](https://github.com/KarinJS/snapka/compare/playwright-v0.1.6...playwright-v0.1.7) (2026-01-18)


### 🐛 Bug Fixes

* 透明度 ([e97a6d6](https://github.com/KarinJS/snapka/commit/e97a6d61c7293af8137201b3d8710fa61b92920c))

## [0.1.6](https://github.com/KarinJS/snapka/compare/playwright-v0.1.5...playwright-v0.1.6) (2025-12-04)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @snapka/browser-finder bumped to 0.1.5
    * @snapka/browsers bumped to 0.1.4

## [0.1.5](https://github.com/KarinJS/snapka/compare/playwright-v0.1.4...playwright-v0.1.5) (2025-12-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @snapka/browser-finder bumped to 0.1.4

## [0.1.4](https://github.com/KarinJS/snapka/compare/playwright-v0.1.3...playwright-v0.1.4) (2025-12-03)


### 🐛 Bug Fixes

* 修改浏览器属性为公共访问 ([5904b80](https://github.com/KarinJS/snapka/commit/5904b80390ef3fb0b8cc92e80726e40d8127fe85))

## [0.1.3](https://github.com/KarinJS/snapka/compare/playwright-v0.1.2...playwright-v0.1.3) (2025-12-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @snapka/browser-finder bumped to 0.1.3
    * @snapka/browsers bumped to 0.1.3

## [0.1.2](https://github.com/KarinJS/snapka/compare/playwright-v0.1.1...playwright-v0.1.2) (2025-12-03)


### 🐛 Bug Fixes

* ci大小写敏感 ([6ad7bde](https://github.com/KarinJS/snapka/commit/6ad7bde0104fe0bcc01d0e2ccdb6aeb02fb7af55))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @snapka/browser-finder bumped to 0.1.2
    * @snapka/browsers bumped to 0.1.2
    * @snapka/playwright-core bumped to 0.1.2
    * @snapka/types bumped to 0.1.2

## [0.1.1](https://github.com/KarinJS/snapka/compare/playwright-v0.1.0...playwright-v0.1.1) (2025-12-03)


### 🎡 Continuous Integration

* fix files ([0171dd0](https://github.com/KarinJS/snapka/commit/0171dd07278782a222d481d50eeb14d896a5c495))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @snapka/browser-finder bumped to 0.1.1
    * @snapka/browsers bumped to 0.1.1
    * @snapka/playwright-core bumped to 0.1.1
    * @snapka/types bumped to 0.1.1

## [0.1.0](https://github.com/KarinJS/snapka/compare/playwright-v0.0.1...playwright-v0.1.0) (2025-12-03)


### ✨ Features

* @snapka/puppeteer ([f8f1e9f](https://github.com/KarinJS/snapka/commit/f8f1e9f06e404768980e3e7ce466cc8d0013f8bc))
* build ([8584105](https://github.com/KarinJS/snapka/commit/858410581134562220129f060c417616e2f6d17d))
* express ([b6a35fe](https://github.com/KarinJS/snapka/commit/b6a35fe6925b135288c2dd1433018995eb9d7923))
* **playwright:** implement PlaywrightLaunch class for browser management ([4db233f](https://github.com/KarinJS/snapka/commit/4db233f283f05418918c7620bc2e5ee91de33d76))


### 🎡 Continuous Integration

* 使用 OIDC 进行发布 ([fb2bd39](https://github.com/KarinJS/snapka/commit/fb2bd39c92680f53d88f7a6e1a1098ce4d421d2b))
