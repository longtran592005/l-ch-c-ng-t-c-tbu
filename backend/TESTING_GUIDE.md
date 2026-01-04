
# How to Test the MeetingRecord API

I have created a test script named `test_api.sh` in the `backend` directory to help you test the API endpoints for Meeting Records.

## Prerequisites

Before running the script, please ensure you have completed the following steps inside the `backend` directory:

1.  **Install Dependencies**: If you haven't already, install the necessary packages.
    ```bash
    npm install
    ```
    You also need to install `multer` for the file upload functionality:
    ```bash
    npm install multer @types/multer
    ```

2.  **Set up the Database**: Run the Prisma commands to set up and seed your database. The seed script has been updated to include a sample schedule.
    ```bash
    npx prisma generate
    npx prisma migrate dev --name init
    npx prisma db seed
    ```

3.  **Start the Server**: Start the backend development server.
    ```bash
    npm run dev
    ```

4.  **Install `jq`**: The test script uses the `jq` command-line tool to parse JSON responses. If you don't have it, you can install it using a package manager like Homebrew (macOS) or `apt-get` (Debian/Ubuntu).
    ```bash
    # On macOS
    brew install jq

    # On Debian/Ubuntu
    sudo apt-get install jq
    ```

## Running the Test Script

1.  **Edit the Script**: Open `backend/test_api.sh` in a text editor. You **must** replace the placeholder IDs at the top of the file with actual IDs from your database.
    ```bash
    # !!! IMPORTANT !!!
    # Replace these placeholder IDs with actual IDs from your database.
    SCHEDULE_ID="<REPLACE_WITH_ACTUAL_SCHEDULE_ID>"
    USER_ID="<REPLACE_WITH_ACTUAL_USER_ID>"
    ```
    You can find these IDs by running `npx prisma studio` and looking at the `User` and `Schedule` tables.

2.  **Make the Script Executable**: Open a new terminal (leaving the server running in the other one) and navigate to the `backend` directory. Make the script executable:
    ```bash
    chmod +x test_api.sh
    ```

3.  **Run the Script**: Execute the script to run the tests.
    ```bash
    ./test_api.sh
    ```

The script will call each of the `MeetingRecord` API endpoints and print the results to the console. It will:
- Create a new meeting record.
- Retrieve the record by its ID.
- Update the record.
- Upload a dummy audio file.
- Generate minutes for the record.
- Delete the record.
- Confirm the deletion by trying to retrieve the record again (which should fail).

Please review the output to ensure all endpoints are working as expected.
