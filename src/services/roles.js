const Roles = Object.freeze({
   admin: 'admin',
   user: 'user',
   from(value) { return (this[value]); }
});
export default Roles;
