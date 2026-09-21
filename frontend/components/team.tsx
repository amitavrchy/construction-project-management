'use client';
import { useEffect, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { label } from '../lib/format';
import { useWorkspace } from './provider';
import { Modal } from './modal';
import { RecordForm } from './record-form';
import { Status } from './status';
export function Team() {
  const {projectId,mutate,user} = useWorkspace();const [team,setTeam] = useState<any[]>([]),[adding,setAdding] = useState(false),[error,setError] = useState('');
  useEffect(() => {if(user?.role === 'COMPANY_ADMIN')api<any[]>('team').then(setTeam).catch(e => setError(e.message));},[user]);
  if(user?.role !== 'COMPANY_ADMIN')return <div className="empty panel"><ShieldCheck size={35}/><h2>Company administrator access</h2><p>Your administrator manages users and project memberships.</p></div>;
  return <><div className="page-heading"><div><span className="eyebrow">THE PEOPLE BEHIND THE PROGRESS</span><h1>Team & access</h1><p>Give everyone the right tools and the right permissions.</p></div><button className="button primary" onClick={() => setAdding(true)}><Plus size={18}/>Add team member</button></div>{error && <p className="form-error">{error}</p>}<div className="panel table-scroll"><table><thead><tr><th>Team member</th><th>Email</th><th>Company role</th><th>Projects</th><th>Access</th></tr></thead><tbody>{team.map(u => <tr key={u.id}><td className="strong"><span className="avatar-inline">{u.name.slice(0,1)}</span>{u.name}</td><td>{u.email}</td><td>{label(u.role)}</td><td>{u.memberships.length}</td><td><Status value={u.active ? 'ACTIVE' : 'CANCELLED'}/></td></tr>)}</tbody></table></div>{adding && <Modal title="Add team member" close={() => setAdding(false)}><RecordForm fields={[{key:'name',label:'Full name'},{key:'email',label:'Email',type:'email'},{key:'password',label:'Initial password (at least 12 characters)',type:'password'},{key:'role',label:'Role',options:['PROJECT_MANAGER','SITE_ENGINEER','STORE_KEEPER','ACCOUNTANT','CONTRACTOR','LABOR_SUPERVISOR']},{key:'contractorId',label:'Contractor (for portal accounts)',ref:'contractor',optional:true}]} close={() => setAdding(false)} onSubmit={async d => {await mutate('team',{...d,projectId,contractorId:d.contractorId || undefined});setTeam(await api('team'));}}/></Modal>}</>;
}
