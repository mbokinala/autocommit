# autocommit

A small command-line utility to generate commit messages by passing the git diff to an LLM. No more `"wip"`, `"stuff`, or `"sdmcskdc"` cluttering the commit log.

## Installation

**TODO: make accessible via npm**

1. Clone this repo
2. Install dependences with `npm install`
3. Install the tool globally with `npm install -g .`

## Setup
1. Get an API key from [OpenAI](https://platform.openai.com/account/api-keys)
2. Set the API key as an environment variable in your `.zshrc` or `.bashrc`:
    ```
    export OPENAI_API_KEY=...
    ```

## Usage
```sh
git add <...>
autocommit
```

Alternatively, pass the `-a` flag to add all unstaged changes to the commit:

```sh
autocommit -a
```

## Roadmap:

- [ ] Add more LLM providers / model options
- [ ] Better documentation
- [ ] Customizable system prompt
- [ ] publish/distribute on npm/brew
- [ ] store API key / model preference in dedicated config file