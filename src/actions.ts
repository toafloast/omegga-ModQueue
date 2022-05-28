//Stores all actions
export class Ban{
    duration;
    reason;
    timeAdded;
    command;
    constructor(duration, reason, target){
        this.duration = duration;
        this.reason = reason;
        this.timeAdded = Date.now();
        this.command = `Chat.Command /Ban ${target} ${duration} ${reason}`
    }
}
export class grantRole{
    role;
    timeAdded;
    command;
    constructor(role, target){
        this.role = role;
        this.timeAdded = Date.now();
        this.command = `Chat.Command /GrantRole ${role.name} ${target}`
    }
}
export class revokeRole{
    role;
    timeAdded;
    command;
    constructor(role, target){
        this.role = role;
        this.timeAdded = Date.now();
        this.command = `Chat.Command /RevokeRole ${role.name} ${target}`
    }
}