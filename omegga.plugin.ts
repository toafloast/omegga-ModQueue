import OmeggaPlugin, { OL, PS, PC, BRRoleSetup, OmeggaPlayer, BRRoleSetupEntry } from 'omegga';
import * as Action from 'src/actions.ts';
type Config = {};
type Storage = {};

export default class Plugin implements OmeggaPlugin<Config, Storage> {
  omegga: OL;
  config: PC<Config>;
  store: PS<Storage>;

  constructor(omegga: OL, config: PC<Config>, store: PS<Storage>) {
    this.omegga = omegga;
    this.config = config;
    this.store = store;
  }
  rgbToHex(r, g, b) {
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  fuzzyCheck(check:string, search:string[]){
    //Return the string closest to the strings we are checking. If none, return false.
    var scores :Object= {};
    //First just check exact-match.
    if(search.find(a=>a===check)){
      console.log("Found an exact match. Returning fuzzy.");
      return search.find(a=>a===check);
    }
    for(var a in search){
      for(var b = 0; b < search[a].length; b++){
        //First, match characters. Case-dependant.
        //Gives 4 score if it's a case-sensitive match, gives 2 if it isn't. Gives 0 if it doesn't match at all.
        scores[search[a]] = (scores[search[a]] || 0) + (search[a][b] === check[b] ? 4 : (search[a][b]).toLowerCase() === (check[b] || "").toLowerCase() ? 2 : 0);
        //Second, subtract points of characters based on distance.
        //console.log(`${search[a]} distance from ${check[b]} to ${search[a][b]} - ${Math.abs(check.indexOf(check[b], b) - search[a].indexOf(search[a][b], b))}`);
        if(check.indexOf(check[b],b) >= 0){
          scores[search[a]] = (scores[search[a]] || 0) - Math.min(Math.abs(check.indexOf(check[b], b) - search[a].indexOf(search[a][b], b)),3) + 1;
        }
      }
    }
    //Finally, sort and return the greater value.
    console.log(scores);
    if(scores){
      //Now we have a bunch of keys. {"a":0, "b":6, "c":-2}.
      //Put all of them into an array, then sort that array.
      var arrayified : any = [];
      Object.entries(scores).forEach(e => arrayified.push([e[0], e[1]]));
      arrayified.sort((a, z) => z[1] - a[1]);
      //Return the matching string.
      if(arrayified[0][1] > arrayified[0][0].length*0.25){
        return arrayified[0][0];
      }
      else{
        return false;
      }
    }
    //Couldn't find a match. Return false.
    return false;
  }
  //seperate functions for tidiness in init
  async queueRole(name:string, event:string, transfer:string, target:any, role:any){
    if(!event){
      this.omegga.whisper(name, `<code>/mq role </>[onJoin/onLeave] [grant/revoke] [target] [role]`);
      return
    }
    event = this.fuzzyCheck(event, ["onJoin", "onLeave"]);
    if(!event){
      this.omegga.whisper(name, `<code>/mq role </><color="ff3333">[onJoin/onLeave]</><code> [grant/revoke] [target] [role]</>`);
      this.omegga.whisper(name, `<color="ff3333">Invalid event - Must be 'onJoin' or 'onLeave'.</>`);
      return
    }
    if(!transfer){
      this.omegga.whisper(name, `<code>/mq role </><color="99ff99">[${event}]</> </>[grant/revoke] [target] [role]`);
      return
    }
    transfer = this.fuzzyCheck(transfer, ["grant", "revoke"]);
    if(!transfer){
      this.omegga.whisper(name, `<code>/mq role </><color="99ff99">[${event}]</> </><color="ff3333">[grant/revoke]</><code> [target] [role]</>`);
      this.omegga.whisper(name, `<color="ff3333">Invalid role transfer - Must be 'grant' or 'revoke'.</>`);
      return
    }
    if(!target){
      this.omegga.whisper(name, `<code>/mq role </><color="99ff99">[${event}]</> <color="ff9999">[${transfer}] </>[target] [role]`);
      return
    }
    if(this.omegga.findPlayerByName(target)){
      target = this.omegga.findPlayerByName(target).name;
    }
    if(!role){
      this.omegga.whisper(name, `<code>/mq role </><color="99ff99">[${event}]</> <color="ff9999">[${transfer}] </><color="9999ff">[${target}] </>[role]`);
      return
    }
    var allRoleNames : string[] = [];
    this.omegga.getRoleSetup().roles.forEach(a => allRoleNames.push(a.name));
    role = this.omegga.getRoleSetup().roles.find(a => this.fuzzyCheck(role, allRoleNames) === a.name);
    if(!role){
      this.omegga.whisper(name, `<color="ff3333">That role doesn't exist.</>`);
      return
    }
    this.omegga.broadcast(`<color="60d3ff">[mq - ${name}]</> <color="ffffff">Queued role [<color="99ff99">${event}</>, <color="ff9999">${transfer}</>, <color="9999ff">${target}</>, <color="${this.rgbToHex(role.color.r, role.color.g, role.color.b)}">${role.name}</>]</>`);
    //Storage : {{name : [a, b]}}
    var data = (await this.store.get(target)||{"onJoin":[], "onLeave":[]});
    var action;
    if(transfer === "grant"){
      action = new Action.grantRole(role, target);
    }
    else{
      action = new Action.revokeRole(role, target);
    }
    data[event].push(action);
    await this.store.set(target, data);
  }

  async queueBan(name:string, event:string, target:string, duration:string, reason:string[]){
    if(!event){
      this.omegga.whisper(name, `<code>/mq ban </>[onJoin/onLeave] [target] [duration]</>`);
      return
    }
    event = this.fuzzyCheck(event, ["onJoin", "onLeave"]);
    if(!event){
      this.omegga.whisper(name, `<code>/mq ban </><color="ff3333">[onJoin/onLeave]</><code> [target] [duration] (reason?)</>`);
      this.omegga.whisper(name, `<color="ff3333">Invalid event - Must be 'onJoin' or 'onLeave'.</>`);
      return
    }
    if(!target){
      this.omegga.whisper(name, `<code>/mq ban </><color="99ff99">[${event}] </>[target] [duration] (reason?)</>`);
      return
    }
    if(this.omegga.findPlayerByName(target)){
      target = this.omegga.findPlayerByName(target).name;
    }
    if(!duration){
      this.omegga.whisper(name, `<code>/mq ban </><color="99ff99">[${event}] </><color="ff9999">[${target}]</> </>[duration] (reason?)</>`);
      return
    }
    this.omegga.broadcast(`<color="60d3ff">[mq - ${name}]</> <color="ffffff">Queued ban [<color="99ff99">${event}</>, <color="ff9999">${target}</>, <color="9999ff">${duration}</> minutes - ''<color="ffff99">${reason}</>'']`);
    var data :any= (await this.store.get(target) || {"onJoin":[], "onLeave":[]});
    var action = new Action.Ban(duration, reason, target);
    data[event].push(action);
    await this.store.set(target, data);
  }

  async init() {
    // Write your plugin!
    //this.store.wipe();
    this.omegga.on('join', async (player, id) => {
      //ban or give roles
      var data = (await this.store.get(player.name));
      if(!data){
        return
        }
      data["onJoin"].forEach(element => {
        //this.omegga.broadcast(element.command);
        this.omegga.writeln(element.command);
        })
      //Clear onJoin stuff. Shouldn't need it anymore.
      data["onJoin"] = [];
      await this.store.set(player.name, data);
    });
    this.omegga.on('leave', async(player, id)=>{
      //ban or give roles
      var data = (await this.store.get(player.name));
      if(!data){
        return
        }
      data["onLeave"].forEach(element => {
        //this.omegga.broadcast(element.command);
        this.omegga.writeln(element.command);
        })
      //Clear onLeave stuff. Shouldn't need it anymore.
      data["onLeave"] = [];
      await this.store.set(player.name, data);
    });

    this.omegga.on('cmd:mq', async (name:string, ...args:string[]) => {
      var pl = this.omegga.findPlayerByName(name);
      var rowles = pl.getRoles();
      if(!pl.isHost){
        if(rowles.find(rowl => rowl === this.config["can-queue"])){
          this.omegga.whisper(name, `<color="ff3333">You don't have the required role - ${this.config["can-queue"]}</>`);
          return
      }}
      if(!args[0]){
        //give usage info and return
        this.omegga.whisper(name, `<code>Usage : /mq [role/ban] [onJoin/onLeave]</>`);
        this.omegga.whisper(name, `<code>/mq role [onJoin/onLeave] [grant/revoke] ["target name"] [role]</>`);
        this.omegga.whisper(name, `<code>/mq ban [onJoin/onLeave] ["target name"] [duration (minutes)] (reason?)</>`);
        this.omegga.whisper(name, `<code>Cleanup commands : /mq clear [player], /mq wipe, /mq list [player]</>`);
        return
      }
      var action = this.fuzzyCheck(args[0], ["role", "ban", "clear", "wipe", "list"]);
      if(action === "role"){
        this.queueRole(name, args[1], args[2], args[3], args[4]);
        return
      }
      if(action === "ban"){
        this.queueBan(name, args[1], args[2], args[3], args.splice(4, 50).toString().replaceAll(",", " "));
        return
      }
      if(action === "clear"){
        if(!args[1]){
          this.omegga.whisper(name, `<color="ff3333">Type <code>/clear [playername]</><color="ff3333"> to clear that player's queued commands.</>`);
          return
        }
        this.omegga.whisper(name, `<color="ff3333">Cleared ${args[1]}'s queued commands.</>`);
        await this.store.delete(args[1]);
        return
      }
      if(action === "wipe"){
        if(args[1] !== "supermonkey99"){
          this.omegga.whisper(name, `<color="ff3333">Type <code>/mq wipe supermonkey99</><color="ff3333"> to clear all queued commands.</>`);
          return
        }
        this.omegga.whisper(name, `[<color="60d3ff">mq</>] - Wiped all stored queues.`);
        await this.store.wipe();
        return
      }
      if(action === "list"){
        if(!args[1]){
          this.omegga.whisper(name, `<code>Usage : /mq list ["player name"]</>`);
          return
        }
        var data = await this.store.get(args[1]);
        if(data){
        this.omegga.whisper(name, `<color="99ff99">- Queued Join Commands -</>`);
        data["onJoin"].forEach(element => this.omegga.whisper(name, `${element.command}`));
        this.omegga.whisper(name, `<color="ff9999">- Queued Leave Commands -</>`);
        data["onLeave"].forEach(element => this.omegga.whisper(name, `${element.command}`));
        return;
        }else{
          this.omegga.whisper(name, `<color="ff3333">Player not found.</>`);
          return
        }
      }
      this.omegga.whisper(name, `<code>Usage : /mq [role/ban] [onJoin/onLeave]</>`);
      this.omegga.whisper(name, `<code>/mq role [onJoin/onLeave] [grant/revoke] ["target name"] [role]</>`);
      this.omegga.whisper(name, `<code>/mq ban [onJoin/onLeave] ["target name"] [duration (minutes)] (reason?)</>`);
      return
    });
    return { registeredCommands: ['mq'] };
  }

  async stop() {
    // Anything that needs to be cleaned up...
  }
}
