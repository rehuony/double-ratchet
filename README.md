## double-ratchet-chat

> [!NOTE]
>
> A simple chat software developed using Golang+React, using a double ratchet key negotiation protocol for key negotiation
>
> Since there are still problems with the sending and receiving information and confirmation mechanism, please try to communicate while both parties are online...

### How to use it?

1.  Cloning this repository to the local and building a Docker environment

2.  Create the `.env` file in the client project directory and write the following content

    ```ini
    # Vite Configuration
    VITE_HOST=localhost:8080
    VITE_ROOT_PATH=/
    VITE_ENCRYPTED=false
    ```

3.  Modify the `vite.config.ts` file, make sure the value of the `base` field is the same as the value of `VITE_ROOT_PATH` above

4.  Create the `.env` file in the root project directory and write the following content

    ```ini
    # Subdirectory of nginx
    ROOT_PATH='/'
    
    # JWT Configuration
    JWT_SECRET=password
    
    # MySQL Configuration
    DB_USER=root
    DB_PORT=3306
    DB_HOST=mysql-server
    DB_SECRET=password
    DB_DATABASE=double_ratchet
    ```

5.  Please make sure that the content of `ROOT_PATH` is the same as the content of `VITE_ROOT_PATH` mentioned above

6.  Execute `docker compose up -d` to access it through `http://localhost`
