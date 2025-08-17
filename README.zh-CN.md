# Rocket

[![构建状态](https://github.com/rwf2/Rocket/workflows/CI/badge.svg)](https://github.com/rwf2/Rocket/actions)
[![Rocket官网](https://img.shields.io/badge/web-rocket.rs-red.svg?style=flat&label=https&colorB=d33847)](https://rocket.rs)
[![当前Crates.io版本](https://img.shields.io/crates/v/rocket.svg)](https://crates.io/crates/rocket)
[![Matrix: #rocket:mozilla.org](https://img.shields.io/badge/style-%23rocket:mozilla.org-blue.svg?style=flat&label=[m])](https://chat.mozilla.org/#/room/#rocket:mozilla.org)

Rocket是一个专注于易用性、安全性、扩展性和速度的Rust异步Web框架。

```rust
#[macro_use] extern crate rocket;

#[get("/<name>/<age>")]
fn hello(name: &str, age: u8) -> String {
    format!("Hello, {} year old named {}!", age, name)
}

#[launch]
fn rocket() -> _ {
    rocket::build().mount("/hello", routes![hello])
}
```

例如，访问 `localhost:8000/hello/John/58` 将会触发 `hello` 路由，结果字符串 `Hello, 58 year old named John!` 会被发送到浏览器。如果传入的 `<age>` 字符串不能被解析为 `u8`，路由不会被调用，结果为404错误。

## 文档

Rocket有详尽的文档：

  * [概览]：简要介绍Rocket的特色。
  * [快速开始]：如何尽可能快地开始使用。
  * [入门指南]：如何开始你的第一个Rocket项目。
  * [完整指南]：Rocket的详细指南和参考。
  * [API文档]："rustdocs"。

[快速开始]: https://rocket.rs/guide/quickstart
[入门指南]: https://rocket.rs/guide/getting-started
[概览]: https://rocket.rs/overview/
[完整指南]: https://rocket.rs/guide/
[API文档]: https://api.rocket.rs

`master`分支的文档可在 https://rocket.rs/master 和 https://api.rocket.rs/master 获取。

主要发布版本`${x}`的文档可在`https://[api.]rocket.rs/v${x}`获取。例如，v0.4的文档可在
https://rocket.rs/v0.4 和 https://api.rocket.rs/v0.4 获取。

最后，活跃git分支的API文档可在`https://api.rocket.rs/${branch}`获取。例如，`master`分支的API文档可在 https://api.rocket.rs/master 获取。分支的rustdocs会在每次提交时构建和部署。

## 示例

[examples](examples#readme)目录包含完整的crate，展示了Rocket的特性和用法。每个示例都可以用Cargo编译和运行。
例如，以下命令序列构建并运行`hello`示例：

```sh
cd examples/hello
cargo run
```

## 获取帮助

如果你在文档之外需要帮助，可以：

  * 通过[GitHub讨论问题]提问。
  * 在Matrix的[`#rocket:mozilla.org`]上与我们聊天（通过[Element]加入）。

[`#rocket:mozilla.org`]: https://chat.mozilla.org/#/room/#rocket:mozilla.org
[通过Element]: https://chat.mozilla.org/#/room/#rocket:mozilla.org
[GitHub讨论问题]: https://github.com/rwf2/Rocket/discussions/categories/questions

## 贡献

绝对欢迎和鼓励贡献！如果你对贡献代码感兴趣，请先阅读完整的[CONTRIBUTING]指南。此外，你可以：

  1. 提交功能请求或错误报告作为[issue]。
  2. 请求改进文档作为[issue]。
  3. 在[需要反馈的issues]上发表评论。
  4. 在[GitHub讨论问题]中回答问题。
  5. 在[GitHub讨论展示与分享]中分享项目。

[issue]: https://github.com/rwf2/Rocket/issues
[需要反馈的issues]: https://github.com/rwf2/Rocket/issues?q=is%3Aissue+is%3Aopen+label%3A%22feedback+wanted%22
[pull requests]: https://github.com/rwf2/Rocket/pulls
[CONTRIBUTING]: CONTRIBUTING.md
[GitHub讨论展示与分享]: https://github.com/rwf2/Rocket/discussions/categories/show-tell

## 许可证

Rocket根据你的选择，在以下任一许可证下授权：

 * Apache许可证，版本2.0，([LICENSE-APACHE](LICENSE-APACHE)或https://www.apache.org/licenses/LICENSE-2.0)
 * MIT许可证 ([LICENSE-MIT](LICENSE-MIT)或https://opensource.org/licenses/MIT)

除非另有明确说明，否则你故意提交以包含在Rocket中的任何贡献都应根据MIT许可证和Apache许可证版本2.0双重授权，没有任何额外条款或条件。

Rocket网站文档在[单独条款](docs/LICENSE)下授权。你故意提交以包含在Rocket网站文档中的任何贡献都应根据这些条款授权。