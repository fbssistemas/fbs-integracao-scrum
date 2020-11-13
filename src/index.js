const axios = require("axios");
const oracledb = require("oracledb");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let dbConfig = {}
let connection;
let integrationStatus = {
  updates: 0,
  errors: 0,
}

const setDbConfig = (host, port, name, user, password) => {
  dbConfig = {
    user,
    password,
    connectString: `(DESCRIPTION =
      (ADDRESS = (PROTOCOL = TCP)(HOST = ${host})(PORT = ${port}))
      (CONNECT_DATA =
        (SERVER = DEDICATED)
        (SERVICE_NAME = ${name})
      )
    )`,
  }
}

const getURL = () => {
  return new Promise((resolve, reject) => {
    connection
      .execute(
        `SELECT ENDERECO 
         FROM TAB_INTEGRACAO 
        WHERE COD_INTEGRACAO = 1`
      )
      .then((res) => {
        resolve(res.rows[0].ENDERECO);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const getClients = (url) => {
  return new Promise((resolve, reject) => {
    axios
      .get(url)
      .then((res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const updateClients = (params = {}) => {
  return new Promise((resolve, reject) => {
    connection
      .execute(
        `BEGIN
          PCK_PESSOA.PRC_LIBERACAO(:cpf_cnpj, :liberado, :versao);
        END;`,
        params
      )
      .then((res) => {
        resolve(true);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const updateIntegrationTable = () => {
  return new Promise((resolve, reject) => {
    connection
      .execute(
        `BEGIN
          UPDATE TAB_INTEGRACAO SET 
            DATA_ATUALIZACAO = SYSDATE 
            WHERE COD_INTEGRACAO = 1;
          COMMIT;
        END;`
      )
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const checkIntegration = async () => {
  try {
    connection = await oracledb.getConnection(dbConfig);
    const url = await getURL();
    const clients = await getClients(url);
    for (let i = 0; i < clients.length; i++) {
      await updateClients(clients[i]);
    }
    await updateIntegrationTable();
    console.log('Integration Complete');
    setIntegrationStatus(false)
  } catch (err) {
    console.log('checkIntegration', err);
    setIntegrationStatus(true)
  } finally {
    if (connection) {
      connection.close();
    }
    setTimeout(checkIntegration, 1000 * 60 * 10);
  }
};

const setIntegrationStatus = (error = false) => {
  const { updates, errors } = integrationStatus
  if (error) {
    integrationStatus = {
      updates,
      errors: errors + 1
    }
    return;
  }
  integrationStatus = {
    errors,
    updates: updates + 1    
  }
}

const getIntegrationStatus = () => {
  return integrationStatus
}

module.exports = {
  setDbConfig,
  getIntegrationStatus,
  checkIntegration
}
