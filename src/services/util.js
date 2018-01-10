const getRandomIntInclusive = (min, max) => {
   const minNew = Math.ceil(min);
   const maxNew = Math.floor(max);
   return Math.floor(Math.random() * ((maxNew - minNew) + 1)) + minNew;
};

export const getRandomColor = () => { // eslint-disable-line import/prefer-default-export
   const randNumber = getRandomIntInclusive(1, 6);
   switch (randNumber) {
      case 1:
         return '#FBBC12';
      case 2:
         return '#EB4435';
      case 3:
         return '#557DBF';
      case 4:
         return '#32A953';
      case 5:
      default:
         return '#cccccc';
   }
};

