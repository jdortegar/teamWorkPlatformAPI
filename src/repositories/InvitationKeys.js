const InvitationKeys = Object.freeze({
   subscriberOrgId: 'subscriberOrgId',
   teamId: 'teamId',
   from(value) { return (this[value]); }
});
export default InvitationKeys;
