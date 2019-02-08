import metafetch from 'metafetch';

const getMetaPromise = url => {
   return new Promise((resolve, reject) => {

      metafetch.fetch(url, function (error, meta) {
         if (error) {
            return reject(error);
         }
         resolve(meta);
      });
   });
};

export const getMeta = async (req, url) => {

   try {
      const metadata = await getMetaPromise(url);
      return metadata;
   } catch (err) {
      return Promise.reject(err);
   }
};
