# Changelog

## [0.3.0](https://github.com/KarinJS/snapka/compare/browsers-v0.2.3...browsers-v0.3.0) (2026-03-25)


### ✨ Features

* **browsers:** add system dependency detection module (deps.ts) ([59e228b](https://github.com/KarinJS/snapka/commit/59e228b5c79b8c5a05f862ed122c7bfc908d8882))
* **browsers:** export checkDependencies/installDependencies from main ([4cc4064](https://github.com/KarinJS/snapka/commit/4cc4064d2eea736b6d966892d0a8f99ba158ff43))


### 🐛 Bug Fixes

* **puppeteer-browsers:** fix security and logic issues ([191c26e](https://github.com/KarinJS/snapka/commit/191c26e3cc5e1b73e22e15626730c0a01f389b0d))


### 🎫 Chores

* **browsers:** add deps testing script ([fe913cd](https://github.com/KarinJS/snapka/commit/fe913cd505c36ce7689ee65fc6a7e96f44c1d146))
* **browsers:** add WSL dependency testing script ([42845d5](https://github.com/KarinJS/snapka/commit/42845d580b2d4671d959ddea56ee200add5a3b61))
* simplify package.json exports ([604b6e8](https://github.com/KarinJS/snapka/commit/604b6e81123c42a64583d451dca39305ace07c05))


### ♻️ Code Refactoring

* **browsers:** replace old installDeps with deps module ([ce72746](https://github.com/KarinJS/snapka/commit/ce7274675e129988a2dda53f22949d5c3bb13b90))


### ✅ Tests

* **browsers:** add unit tests for deps module ([aca07f1](https://github.com/KarinJS/snapka/commit/aca07f17b4da6daeeca5ee0b05756b564719364a))

## [0.2.3](https://github.com/KarinJS/snapka/compare/browsers-v0.2.2...browsers-v0.2.3) (2026-02-23)


### 🐛 Bug Fixes

* chrome-for-testing-public ([22877a4](https://github.com/KarinJS/snapka/commit/22877a4ced64a67be311644ed53321399b0574f8))
* chrome-for-testing-public ([b415de8](https://github.com/KarinJS/snapka/commit/b415de87b81debad4365d2caad1049509e168d35))

## [0.2.2](https://github.com/KarinJS/snapka/compare/browsers-v0.2.1...browsers-v0.2.2) (2026-02-23)


### 🐛 Bug Fixes

* **browsers:** probeUrls 仅探测 origin 并兜底返回首个 URL ([7cb0322](https://github.com/KarinJS/snapka/commit/7cb03223be4ca973cc3cf20720eb27f8e582515e))

## [0.2.1](https://github.com/KarinJS/snapka/compare/browsers-v0.2.0...browsers-v0.2.1) (2026-02-23)


### 🐛 Bug Fixes

* **browsers:** align tsdown entry key with source filename so bin path is consistent after publish ([e636d22](https://github.com/KarinJS/snapka/commit/e636d22b44bcd9ba6f26a9d8f0bab2b2210fe6eb))
* **browsers:** fix bin field pointing to source file instead of dist output ([eaef80d](https://github.com/KarinJS/snapka/commit/eaef80d0c547fb905679d498703c280a23dd950b))

## [0.2.0](https://github.com/KarinJS/snapka/compare/browsers-v0.1.4...browsers-v0.2.0) (2026-02-23)


### ✨ Features

* mirror probe auto-select, default to aliyun npmmirror ([2b6d130](https://github.com/KarinJS/snapka/commit/2b6d1304ab5d095731c08ea13e5dbfc64a5576ab))


### 🐛 Bug Fixes

* security and logic improvements across all packages ([9394626](https://github.com/KarinJS/snapka/commit/93946268d2031236494c05040efa8d38fb666ca9))
* 修复各包单元测试并更新断言以匹配源码 ([8c343c5](https://github.com/KarinJS/snapka/commit/8c343c57d75800ef6dd6d9a6417b9c19970e89b4))

## [0.1.4](https://github.com/KarinJS/snapka/compare/browsers-v0.1.3...browsers-v0.1.4) (2025-12-04)


### 🐛 Bug Fixes

* **browsers:** cli入口 ([b0e62ba](https://github.com/KarinJS/snapka/commit/b0e62ba3e1001701821fa7b2f23aff5950f32fdf))

## [0.1.3](https://github.com/KarinJS/snapka/compare/browsers-v0.1.2...browsers-v0.1.3) (2025-12-03)


### 🐛 Bug Fixes

* **browsers:** 修正exports ([e8b3155](https://github.com/KarinJS/snapka/commit/e8b31551663f066d2d8a48d2790a413ee56b90c3))

## [0.1.2](https://github.com/KarinJS/snapka/compare/browsers-v0.1.1...browsers-v0.1.2) (2025-12-03)


### 🐛 Bug Fixes

* ci大小写敏感 ([6ad7bde](https://github.com/KarinJS/snapka/commit/6ad7bde0104fe0bcc01d0e2ccdb6aeb02fb7af55))

## [0.1.1](https://github.com/KarinJS/snapka/compare/browsers-v0.1.0...browsers-v0.1.1) (2025-12-03)


### 🐛 Bug Fixes

* mode ([186e463](https://github.com/KarinJS/snapka/commit/186e463f5f2561244c2cbb253d9f53225502f47e))


### 🎡 Continuous Integration

* fix files ([0171dd0](https://github.com/KarinJS/snapka/commit/0171dd07278782a222d481d50eeb14d896a5c495))

## [0.1.0](https://github.com/KarinJS/snapka/compare/browsers-v0.0.1...browsers-v0.1.0) (2025-12-03)


### ✨ Features

* @snapka/puppeteer ([f8f1e9f](https://github.com/KarinJS/snapka/commit/f8f1e9f06e404768980e3e7ce466cc8d0013f8bc))
* build ([8584105](https://github.com/KarinJS/snapka/commit/858410581134562220129f060c417616e2f6d17d))


### 🎡 Continuous Integration

* 使用 OIDC 进行发布 ([fb2bd39](https://github.com/KarinJS/snapka/commit/fb2bd39c92680f53d88f7a6e1a1098ce4d421d2b))
