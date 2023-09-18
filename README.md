<h1 align="center">
hey,
</h1>
<h3 align="center">Run shell commands using natural language</h3>
<p align="center">
  <a href="#" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
</p>
<p align="center">
  ·
  <a href="https://github.com/TimoBechtel/hey,/issues">Report Bug / Request Feature</a>
  ·
</p>
<p align="center">
<img width="750px" alt="running command example" src="./assets/is-it-safe.gif">
</p>

## Table of Contents

- [About](#about)
- [Installation](#install)
- [Setup](#setup)
- [Usage](#usage)
  - [`hey, run`](#hey-run)
  - [`hey, explain`](#hey-explain)
- [Data sent to OpenAI](#data-sent-to-openai)
- [More examples](#more-examples)
- [Contributing](#contributing)

## About

Use natural language to run shell commands using GPT-3.

Just say what you want to do and `hey,` will generate the command for you.

### Features

- use natural language to run shell commands
- explains files, scripts or any data scripts using GPT-3
- caches successful commands to speed up future runs

### Why?

Shell scrips are powerful, but only if you know how to use them. `hey,` makes it easier to use shell scripts by using natural language.

Always forget the command to pack a directory into a tarball? Just say it:

```sh
hey, create a tarball with all files in the current directory, except javascript files
```

## Install

`hey,` requires Node.js v16 or higher.

```sh
npm i -g hey-comma
```

> Note: pnpm does not like the comma, so only the `hey` alias is available. You can add the alias manually if you want to: `alias hey,=hey`

## Setup

### OpenAI API key

`hey,` uses OpenAI's API to generate the commands. You need to [sign up for an OpenAI account](https://beta.openai.com/signup) and [create an API key](https://beta.openai.com/account/api-keys).

Then, run:

```sh
hey, setup
```

and follow the instructions. This will create a `.hey-comma` folder in your home directory and store your API key there.

If you're not comfortable with saving your api key as plain text, you can also set your api key as environment variable and configure `hey,` to read it from there:

```sh
export YOUR_ENV_VAR_NAME=sk-...
hey, config set openai_api_key "env:YOUR_ENV_VAR_NAME"
```

## Usage

`hey,` currently has two modes: `run` and `explain`. Most of the time you don't need to specify the mode specifically, as `hey,` will automatically detect the mode based on whether you pipe data to it or not.

<p align="center">
<img width="650px" alt="running command example" src="./assets/copy-gif.gif">
</p>

### `hey, run`

`hey, run` is the default mode. It will convert your instruction to a shell command and run it. **It will always ask for confirmation before running the command.**

```sh
hey, create a tarball with all files in the current dir, except js files
```

You can explicitly specify the mode:

```sh
hey, run: what are the largest files in my download directory
```

_(colon is optional)_

### `hey, explain`

`hey, explain` will explain the data you pipe to it.

> Note: the piped data will be sent to OpenAI's servers, so you should only pipe data to `hey, explain` that you are comfortable sharing with OpenAI.

```sh
cat mysterious.sh | hey, is this safe to run
```

You can explicitly specify the mode:

```sh
cat script.sh | hey, explain: what does this do
```

_(colon is optional)_

### Special characters

To pass special characters to the `hey,`, you can pass them as a quoted string:

```sh
hey, "what is the most recent file in ~/Documents?"
```

## Use a different OpenAI model (e.g. GPT-4)

By default, `hey,` uses GPT-3 (gpt-). If you want to use another mode, like GPT-4, you can set the `openai_model` option:

```sh
hey, config set openai_model gpt-4
```

You can also use gpt-4 for a single command:

```sh
hey, "what is the most recent file in ~/Documents?" --gpt4
```

> Note that gpt-4 is significantly more expensive and quite a bit slower than gpt-3.

## Data sent to OpenAI

`hey,` will send the following data to OpenAI:

- The command you want to run
- The data you pipe to `hey, explain`
- Your current shell (e.g. `bash` or `zsh`)

## More examples

<p align="center">
<img width="650px" alt="running command example" src="./assets/ip-addr.gif">
</p>

```sh
hey, what are the largest files in my download directory
```

```sh
cat salaries.csv | hey, what is the average salary of people with a PhD
```

```sh
cat script.sh | hey, explain
```

## Contributing

### Development

This project uses [bun](https://bun.sh/) as package manager & bundler.

If you don't have bun installed, run:

```sh
curl -fsSL https://bun.sh/install | bash
```

#### Install dependencies

```sh
bun install
```

#### Build

```sh
bun run build
```

### Commit messages

This project uses semantic-release for automated release versions. So commits in this project follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0-beta.2/) guidelines. I recommend using [commitizen](https://github.com/commitizen/cz-cli) for automated commit messages.
