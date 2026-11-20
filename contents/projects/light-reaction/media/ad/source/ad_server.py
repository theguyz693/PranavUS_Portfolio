"""Serves the project's real dashboard (read-only) plus the ad page at /ad. Port 5058."""
import os
import sys

sys.dont_write_bytecode = True
PROJECT = os.environ.get("LIGHT_REACTION_DIR", r"C:\light_reaction")
sys.path.insert(0, PROJECT)

import app as light  # real project module; nothing in it is modified
from aiohttp import web

HERE = os.path.dirname(os.path.abspath(__file__))


async def ad_page(request):
    return web.FileResponse(os.path.join(HERE, "ad.html"))


def main():
    app = light.create_app()
    app.router.add_get("/ad", ad_page)
    web.run_app(app, host="127.0.0.1", port=5058, print=None)


if __name__ == "__main__":
    main()
