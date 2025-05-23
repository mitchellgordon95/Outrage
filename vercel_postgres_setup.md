## Setting up Vercel Postgres

This guide will walk you through creating a Vercel Postgres database and connecting it to your Vercel project.

### 1. Create a Vercel Postgres Database

1.  **Navigate to the Vercel Dashboard:** Log in to your Vercel account and go to your project's dashboard.
2.  **Go to the Storage Tab:** In the project dashboard, click on the "Storage" tab in the top navigation bar.
3.  **Create a New Database:**
    *   Click on the "Create Database" button.
    *   Select "Postgres" as the database type.
    *   Choose a region for your database (preferably one close to your users or your serverless functions).
    *   Give your database a name (e.g., `my-campaign-app-db`).
    *   Click "Create".

### 2. Connect to Your Vercel Project

1.  **Select Your Project:** After the database is created, Vercel will prompt you to connect it to a project.
2.  **Choose Connection Type:** Select the appropriate connection type (e.g., "Production", "Preview", "Development"). You can connect the same database to multiple environments or create separate databases for each. For now, connecting to "Production" and "Preview" should be sufficient.
3.  **Link the Database:** Click "Connect". Vercel will automatically create environment variables for your project (e.g., `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`, etc.).

### 3. Find the Database Connection String

1.  **Go to Project Settings:** Navigate back to your project's dashboard.
2.  **Go to Environment Variables:** Click on "Settings" and then "Environment Variables" in the left sidebar.
3.  **Locate `POSTGRES_URL`:** You will find a list of environment variables automatically added by Vercel when you connected the database. The primary connection string you'll typically use with most Node.js Postgres clients (like `pg`) is `POSTGRES_URL`. Copy this value.

    *   **Note:** Vercel provides several connection strings. `POSTGRES_URL` is the pooled connection string, which is generally recommended for serverless environments.

### 4. Add `POSTGRES_URL` as an Environment Variable (if needed)

Vercel usually adds this automatically when you connect the database. However, if you need to add it manually or for local development:

1.  **For Vercel Project:**
    *   In your project's "Settings" > "Environment Variables" page, click "Add New".
    *   Set the name to `POSTGRES_URL`.
    *   Paste the copied connection string into the value field.
    *   Select the environments (Production, Preview, Development) where this variable should be available.
    *   Click "Save".

2.  **For Local Development:**
    *   Create a `.env` file in the root of your project (ensure `.env` is listed in your `.gitignore` file to prevent committing it).
    *   Add the following line to your `.env` file:
        ```
        POSTGRES_URL="your_copied_postgres_url_here"
        ```
    *   Replace `"your_copied_postgres_url_here"` with the actual connection string.

### 5. Running the Schema

Once your database is set up and you have the connection string, you need to create the tables defined in your SQL schema. You can do this in several ways:

*   **Using `psql` (Command Line):**
    1.  Ensure you have `psql` installed (it comes with a full PostgreSQL installation).
    2.  Open your terminal and connect to your Vercel Postgres database using the `POSTGRES_URL_NON_POOLING` connection string (psql requires a direct, non-pooled connection for operations like creating tables):
        ```bash
        psql "your_copied_postgres_url_non_pooling_here"
        ```
    3.  Once connected, you can execute the `CREATE TABLE` statement directly in the `psql` prompt. Copy the content of your `campaigns_schema.sql` file and paste it into the terminal, then press Enter.
        ```sql
        -- Paste your CREATE TABLE statement here, for example:
        CREATE TABLE campaigns (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            demands JSONB,
            representatives JSONB,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            message_sent_count INTEGER DEFAULT 0
        );
        ```
    4.  Type `\q` to exit `psql`.

*   **Using a Database GUI Client (pgAdmin, DBeaver, TablePlus, etc.):**
    1.  Download and install your preferred GUI client.
    2.  Create a new connection in the client.
    3.  Use the connection details from your Vercel Postgres database settings. You can typically find these details (host, port, database name, user, password) by clicking on your database in the Vercel "Storage" tab and looking at the "Connection Details" or by deconstructing the `POSTGRES_URL_NON_POOLING` string.
        *   The format is generally: `postgres://<user>:<password>@<host>:<port>/<database_name>`
    4.  Once connected, open a SQL query tool/editor within the GUI client.
    5.  Paste your `CREATE TABLE` statement from `campaigns_schema.sql` into the query editor and run the query.

*   **Using a Migration Tool (Advanced):** For more complex applications, consider using a migration tool like `node-pg-migrate`, Prisma Migrate, or TypeORM migrations. These tools help manage database schema changes over time in a more structured way. You would typically configure these tools with your `POSTGRES_URL`.

After running the schema, your `campaigns` table will be ready in your Vercel Postgres database.
