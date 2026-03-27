# NovaDesk

NovaDesk is a web proxy and dashboard with a minimal home screen, built-in games and apps lists, optional tab mode, themes, and tab cloaking. Deploy it on a **real Node server** (not a static file host).

**Repository:** [github.com/cmd-premium/NovaDesk](https://github.com/cmd-premium/NovaDesk)

## Quick start

```bash
git clone https://github.com/cmd-premium/NovaDesk.git
cd NovaDesk
pnpm install
pnpm start
```

Default listen: `http://localhost:8080` (or `PORT` from the environment).

## Password protection

Edit `config.js`: set `challenge` to `true` and configure `users` (e.g. `novadesk: "your-password"`). Run with your usual start command.

## License

See [LICENSE](LICENSE) in this repository.
