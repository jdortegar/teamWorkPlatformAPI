import Redshift from 'node-redshift';
import config from '../config/env';

const client = {
   user: config.redshift.user,
   database: config.redshift.database,
   password: config.redshift.password,
   port: config.redshift.port,
   host: config.redshift.host
};

const redshiftClient = new Redshift(client);

export default redshiftClient;
