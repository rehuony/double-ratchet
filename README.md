## DoubleRatchetDemo

>   [!NOTE]
>
>   A simple chat software developed using Golang+React, using a double ratchet key negotiation protocol for key negotiation
>
>   Since there are still problems with the sending and receiving information and confirmation mechanism, please try to communicate while both parties are online...

### How to use it?

1.  Cloning this repository to the local and building a Docker environment

2.  Create the `.env` file in the root project directory and write the following content

    ```ini
    # MySQL Configuration
    DB_USER=root
    DB_PORT=3306
    DB_HOST=mysql-server
    DB_SECRET=password
    DB_DATABASE=double_ratchet
    
    # JWT Configuration
    JWT_SECRET=password
    
    # Vite Configuration
    VITE_WS_URL=ws://localhost:80
    VITE_BASE_URL=http://localhost:80
    USER_INFOR_STORAGE=userinfor
    ```

3.  Execute `docker compose up -d` to access it through `http://localhost`
