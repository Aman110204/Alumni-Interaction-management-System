import { LayoutDashboard, User, GraduationCap, Link2, MessageCircle, Calendar, Briefcase, Users, BookOpen } from 'lucide-react';

export const STUDENT_NAV = [
  { label: 'Main', items: [
    { label: 'Dashboard',      path: '/student/dashboard',     icon: <LayoutDashboard size={16} strokeWidth={2} /> },
    { label: 'Profile',        path: '/student/profile',       icon: <User size={16} strokeWidth={2} /> },
  ]},
  { label: 'Network', items: [
    { label: 'Alumni Network', path: '/network',               icon: <Users size={16} strokeWidth={2} /> },
    { label: 'Connections',    path: '/student/connections',   icon: <Link2 size={16} strokeWidth={2} /> },
    { label: 'Messages',       path: '/student/messages',      icon: <MessageCircle size={16} strokeWidth={2} /> },
  ]},
  { label: 'Explore', items: [
    { label: 'Events',         path: '/student/events',        icon: <Calendar size={16} strokeWidth={2} /> },
    { label: 'Job Posts',      path: '/student/opportunities', icon: <Briefcase size={16} strokeWidth={2} /> },
    { label: 'Internships',    path: '/student/internships',   icon: <BookOpen size={16} strokeWidth={2} /> },
  ]},
];
