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

try:
    # Connect to the MySQL server
    connection = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

    with connection.cursor() as cursor:
        # Drop the database if it exists
        cursor.execute(f"DROP DATABASE IF EXISTS `{DB_NAME}`")
        print(f"Database '{DB_NAME}' dropped successfully.")

except pymysql.MySQLError as e:
    print(f"Error connecting to MySQL or dropping database: {e}")

finally:
    if 'connection' in locals() and connection.open:
        connection.close()
