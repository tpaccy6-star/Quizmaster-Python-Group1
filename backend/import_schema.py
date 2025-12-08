import pymysql
from dotenv import load_dotenv
import os

load_dotenv()

# Get database connection details from .env
database_url = os.getenv('DATABASE_URL', '')
try:
    DB_NAME = database_url.split('/')[-1]
    if '?' in DB_NAME:
        DB_NAME = DB_NAME.split('?')[0]

    user_part = database_url.split('//')[1].split('@')[0]
    if ':' in user_part:
        DB_USER = user_part.split(':')[0]
        DB_PASSWORD = user_part.split(':')[1]
    else:
        DB_USER = user_part
        DB_PASSWORD = ''

    DB_HOST = database_url.split('@')[1].split('/')[0]

except IndexError:
    print("Could not parse DATABASE_URL. Please check your .env file.")
    exit(1)

SQL_FILE_PATH = 'database_schema.sql'

try:
    # Read the SQL file
    with open(SQL_FILE_PATH, 'r', encoding='utf-8') as f:
        sql_script = f.read()

    # Connect to the database
    connection = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

    with connection.cursor() as cursor:
        # Split the script into individual statements and execute them
        sql_commands = [cmd.strip()
                        for cmd in sql_script.split(';') if cmd.strip()]
        for command in sql_commands:
            if command:
                try:
                    cursor.execute(command)
                except pymysql.MySQLError as cmd_err:
                    print(
                        f"Error executing command: {command[:100]}...\n{cmd_err}")
        connection.commit()
        print(
            f"Schema from '{SQL_FILE_PATH}' imported successfully into '{DB_NAME}'.")

except FileNotFoundError:
    print(f"Error: SQL file not found at '{SQL_FILE_PATH}'")
except pymysql.MySQLError as e:
    print(f"Error connecting to MySQL or importing schema: {e}")
finally:
    if 'connection' in locals() and connection.open:
        connection.close()
