const getRandomIntInclusive = (min, max) => {
   const minNew = Math.ceil(min);
   const maxNew = Math.floor(max);
   return Math.floor(Math.random() * ((maxNew - minNew) + 1)) + minNew;
};

export const getRandomColor = () => { // eslint-disable-line import/prefer-default-export
   const randNumber = getRandomIntInclusive(1, 6);
   let color;
   switch (randNumber) {
      case 1:
         color = '#FBBC12';
         break;
      case 2:
         color = '#EB4435';
         break;
      case 3:
         color = '#557DBF';
         break;
      case 4:
         color = '#32A953';
         break;
      case 5:
      default:
         color = '#cccccc';
         break;
   }
   return color;
};

