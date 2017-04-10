export class Test {
   TEST_TYPES = ['unit', 'db', 'server', 'ui'];

   testType;

   constructor(testType) {
      if (Test.TEST_TYPES.indexOf(testType) <= 0) {
         throw new Error(`Unknown test type: "${testType}".  Valid values are ${Test.TEST_TYPES}`);
      }
      this.testType = testType;
   }
}
Object.freeze(Test.TEST_TYPES);
