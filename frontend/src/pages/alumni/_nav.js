import { LayoutDashboard, User, Users, Link2, MessageCircle, Briefcase, Share2, GraduationCap, Calendar, BookOpen } from 'lucide-react';

export const ALUMNI_NAV = [
  { label: 'Main', items: [
    { label: 'Dashboard',       path: '/alumni/dashboard',      icon: <LayoutDashboard size={16} strokeWidth={2} /> },
    { label: 'Profile',         path: '/alumni/profile',        icon: <User size={16} strokeWidth={2} /> },
  ]},
  { label: 'Network', items: [
    { label: 'Students',        path: '/alumni/students',       icon: <GraduationCap size={16} strokeWidth={2} /> },
    { label: 'Alumni Network',  path: '/network',               icon: <Users size={16} strokeWidth={2} /> },
    { label: 'Connections',     path: '/alumni/connections',    icon: <Link2 size={16} strokeWidth={2} /> },
    { label: 'Messages',        path: '/alumni/messages',       icon: <MessageCircle size={16} strokeWidth={2} /> },
  ]},
  { label: 'Manage', items: [
    { label: 'Job Posts',       path: '/alumni/opportunities',  icon: <Briefcase size={16} strokeWidth={2} /> },
    { label: 'Post Internship', path: '/alumni/internships',    icon: <BookOpen size={16} strokeWidth={2} /> },
    { label: 'Events',          path: '/alumni/events',         icon: <Calendar size={16} strokeWidth={2} /> },
  ]},
];
