# autocommit

A small command-line utility to generate commit messages by passing the git diff to an LLM. No more `"wip"`, `"stuff"`, or `"sdmcskdc"` cluttering the commit log.

## Installation
1. Install with npm:
    ```sh
    npm install -g @mbokinala/autocommit
    ```
2. Get an API key from [OpenAI](https://platform.openai.com/account/api-keys)
3. Set the API key as an environment variable in your `.zshrc` or `.bashrc` (you'll need to reload the shell for the change to take effect):
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
- [ ] Publish/distribute on npm/brew
- [ ] Store API key / model preference in dedicated config file
- [ ] Add tests
- [ ] Proper config management in dotfile