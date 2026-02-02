import os
from urllib.parse import urlparse

from sqlalchemy import create_engine, text


def ensure_database_exists(database_url: str):
    """
    If using MySQL and the DB doesn't exist, create it.
    Works for URLs like:
      mysql+pymysql://user:pass@host:port/supermarket?charset=utf8mb4
    """
    if not database_url.startswith("mysql"):
        # sqlite/postgres etc: do nothing here
        return

    parsed = urlparse(database_url)
    db_name = parsed.path.lstrip("/")
    if not db_name:
        return

    # build server url without DB name
    server_url = database_url.replace(f"/{db_name}", "/")

    engine = create_engine(server_url, pool_pre_ping=True)

    with engine.connect() as conn:
        conn.execute(text(
            f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        ))
        conn.commit()
