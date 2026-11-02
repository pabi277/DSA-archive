import { useState } from 'react'
import { catalogue } from './catalogue'
import { groupWeeklyProgress, rankFriends } from './friends'
import type { FriendsState } from './friendsData'

export function FriendsView({ friends, today }: { friends: FriendsState; today: string }) {
  const [code, setCode] = useState('')
  const [goal, setGoal] = useState(20)
  if (!friends.uid) return <section className="empty-state" data-testid="friends-view"><h2>Friends</h2><p>Sign in to invite friends. Sharing is off until you choose to enable it.</p></section>
  const visible = Object.values(friends.summaries)
  const participants = friends.profile?.sharing ? [...visible, { uid: friends.uid, summary: friends.summary }] : visible
  const ranked = rankFriends(participants, today)
  const group = groupWeeklyProgress(participants, today, goal)
  return <section data-testid="friends-view">
    <div className="section-heading"><div><h2>Friends</h2><p>Invite people you trust. Only opted-in counts and streaks are shared; notes and individual progress stay private.</p></div></div>
    {friends.error && <p role="alert">{friends.error}</p>}
    <div className="notice"><div><strong>Summary sharing: {friends.profile?.sharing ? 'on' : 'off'}</strong><p>Friends can see your solved totals by topic, streak and rolling seven-day solves. Turn off to revoke access.</p></div>
      <button className="button button-secondary" type="button" disabled={friends.busy || !friends.profile} onClick={() => friends.setSharing(!friends.profile?.sharing)}>{friends.profile?.sharing ? 'Stop sharing' : 'Share summary'}</button>
    </div>
    <h3>Invite a friend</h3><p>Anyone with this code can join your friends list. Share privately; rotating prevents new uses of the old code. Rotate after removing someone who still knows it.</p>
    {friends.profile?.code && <p data-testid="invite-code"><code>{friends.profile.code}</code></p>}
    <button className="button button-secondary" type="button" disabled={friends.busy || !friends.profile} onClick={friends.createInvite}>{friends.profile?.code ? 'Rotate invite code' : 'Create invite code'}</button>
    <form onSubmit={(e) => { e.preventDefault(); friends.addFriend(code) }}>
      <label htmlFor="friend-code">Friend's invite code</label>{' '}
      <input id="friend-code" value={code} autoComplete="off" onChange={(e) => setCode(e.target.value)} />{' '}
      <button className="button button-secondary" disabled={friends.busy} type="submit">Add friend</button>
    </form>
    <h3>Your friends ({friends.ids.length})</h3>
    {friends.ids.length === 0 && <p>No friends yet. Exchange an invite code to get started.</p>}
    {friends.ids.map((id) => {
      const item = friends.summaries[id]
      return <div className="notice" key={id} data-testid={`friend-${id}`}><div><strong>{item?.summary.displayName ?? 'Summary unavailable'}</strong><p>{item ? `${item.summary.solvedCount} solved · ${item.summary.currentStreak} day streak · updated ${item.summary.asOf}` : 'This friend is not sharing, has not published, or is offline.'}</p></div><button className="button button-secondary" type="button" disabled={friends.busy} onClick={() => friends.removeFriend(id)}>Remove friend</button></div>
    })}
    <h3>Friends leaderboard</h3><p>Rolling seven-day solves; only summaries updated today are ranked. Others are excluded, not counted as zero.</p>
    {ranked.length ? <ol data-testid="friends-leaderboard">{ranked.map((item) => <li key={item.uid}>{item.summary.displayName}: {item.summary.weeklySolved} solved</li>)}</ol> : <p>No current shared summaries.</p>}
    <h3>Weekly group goal</h3><label htmlFor="group-goal">Your goal for this group (this session only)</label>{' '}
    <input id="group-goal" type="number" min="1" max="10000" value={goal} onChange={(e) => setGoal(Math.max(1, Math.min(10000, Number(e.target.value) || 1)))} />
    <p data-testid="friends-goal">{group.total}/{group.goal} solves · {group.included} current summaries · {group.stale} out of date · {friends.ids.length - visible.length} unavailable</p>
    <h3>Compare by topic</h3><p>Counts from available shared summaries only.</p>
    {visible.length === 0 ? <p>No shared summaries to compare.</p> : visible.map(({ uid, summary }) => <details key={uid}><summary>{summary.displayName} · {summary.solvedCount} solved</summary><ul>{catalogue.topics.map((topic) => <li key={topic.id}>{topic.title}: you {friends.summary.solvedByTopic[topic.id]} · {summary.displayName} {summary.solvedByTopic[topic.id]}</li>)}</ul></details>)}
  </section>
}
