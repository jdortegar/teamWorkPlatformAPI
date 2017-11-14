const getRandomIntInclusive = (min, max) => {
   const minNew = Math.ceil(min);
   const maxNew = Math.floor(max);
   return Math.floor(Math.random() * ((maxNew - minNew) + 1)) + minNew;
};

export const getRandomColor = () => { // eslint-disable-line import/prefer-default-export
   const randR = getRandomIntInclusive(1, 20) * 10;
   const randG = getRandomIntInclusive(1, 20) * 10;
   const randB = getRandomIntInclusive(1, 20) * 10;
   return `rgba(${randR},${randG},${randB},1)`;
};

