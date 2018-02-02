const InvitationKeys = Object.freeze({
   subscriberOrgId: 'subscriberOrgId',
   teamId: 'teamId',
   teamRoomId: 'teamRoomId',
   from(value) { return (this[value]); }
});
export default InvitationKeys;
