import type { Workflow, Project } from '@/lib/types';

export const defaultWorkflow: Workflow = {
  stages: [
    {
      id: 'stage-1-initiation',
      name: 'Initiation',
      color: '#6366f1',
      taskTemplates: [
        {
          id: 'task-init-1',
          title: 'Initial site assessment',
          description: 'Conduct preliminary site visit and feasibility analysis'
        },
        {
          id: 'task-init-2',
          title: 'Project charter creation',
          description: 'Draft and approve project charter with stakeholders'
        }
      ]
    },
    {
      id: 'stage-2-design',
      name: 'Design',
      color: '#8b5cf6',
      taskTemplates: [
        {
          id: 'task-design-1',
          title: 'System design',
          description: 'Design PV system layout and electrical specifications'
        },
        {
          id: 'task-design-2',
          title: 'Engineering drawings',
          description: 'Create detailed engineering and CAD drawings'
        },
        {
          id: 'task-design-3',
          title: 'Design review',
          description: 'Conduct internal design review and approval'
        }
      ]
    },
    {
      id: 'stage-3-permitting',
      name: 'Permitting',
      color: '#ec4899',
      taskTemplates: [
        {
          id: 'task-permit-1',
          title: 'Submit permit applications',
          description: 'Submit all required building and electrical permits'
        },
        {
          id: 'task-permit-2',
          title: 'Utility interconnection agreement',
          description: 'Secure utility approval for grid connection'
        },
        {
          id: 'task-permit-3',
          title: 'Obtain permits',
          description: 'Receive all approved permits from authorities'
        }
      ]
    },
    {
      id: 'stage-4-procurement',
      name: 'Procurement',
      color: '#f97316',
      taskTemplates: [
        {
          id: 'task-proc-1',
          title: 'Equipment ordering',
          description: 'Order solar panels, inverters, and mounting hardware'
        },
        {
          id: 'task-proc-2',
          title: 'Delivery coordination',
          description: 'Coordinate delivery schedule with site readiness'
        }
      ]
    },
    {
      id: 'stage-5-construction',
      name: 'Construction',
      color: '#eab308',
      taskTemplates: [
        {
          id: 'task-const-1',
          title: 'Site preparation',
          description: 'Prepare site and install mounting structures'
        },
        {
          id: 'task-const-2',
          title: 'Panel installation',
          description: 'Install solar panels and complete wiring'
        },
        {
          id: 'task-const-3',
          title: 'Inverter and electrical',
          description: 'Install inverters and complete electrical connections'
        }
      ]
    },
    {
      id: 'stage-6-commissioning',
      name: 'Commissioning',
      color: '#22c55e',
      taskTemplates: [
        {
          id: 'task-comm-1',
          title: 'System testing',
          description: 'Test all electrical systems and performance'
        },
        {
          id: 'task-comm-2',
          title: 'Final inspection',
          description: 'Pass final inspection from building department'
        },
        {
          id: 'task-comm-3',
          title: 'Utility approval',
          description: 'Obtain permission to operate from utility'
        }
      ]
    },
    {
      id: 'stage-7-handover',
      name: 'Handover',
      color: '#06b6d4',
      taskTemplates: [
        {
          id: 'task-hand-1',
          title: 'Documentation package',
          description: 'Compile all project documentation and warranties'
        },
        {
          id: 'task-hand-2',
          title: 'Owner training',
          description: 'Conduct training session with system owner'
        }
      ]
    },
    {
      id: 'stage-8-closeout',
      name: 'Closeout',
      color: '#0ea5e9',
      taskTemplates: [
        {
          id: 'task-close-1',
          title: 'Final payment',
          description: 'Process final payment and close financial records'
        },
        {
          id: 'task-close-2',
          title: 'Project review',
          description: 'Conduct post-project review and lessons learned'
        }
      ]
    }
  ]
};

export const mockProjects: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Sunnyvale Community Center',
    location: 'Sunnyvale, CA',
    priority: 1,
    owner: 'user-jessica-martinez',
    attachments: [],
    milestones: [],
    currentStageId: 'stage-5-construction',
    stages: {
      'stage-1-initiation': {
        enteredAt: '2024-01-15T10:00:00Z',
        tasks: [
          {
            id: 'task-1',
            title: 'Initial site assessment',
            description: 'Conduct preliminary site visit and feasibility analysis',
            assignee: 'user-alex-johnson',
            dueDate: '2024-01-20',
            status: 'complete' as const,
            comments: [],
            attachments: []
          },
          {
            id: 'task-2',
            title: 'Project charter creation',
            description: 'Draft and approve project charter with stakeholders',
            assignee: 'user-jessica-martinez',
            dueDate: '2024-01-25',
            status: 'complete' as const,
            comments: [],
            attachments: []
          }
        ]
      },
      'stage-5-construction': {
        enteredAt: '2024-11-01T08:00:00Z',
        tasks: [
          {
            id: 'task-3',
            title: 'Site preparation',
            description: 'Prepare site and install mounting structures',
            assignee: 'user-liam-miller',
            dueDate: '2024-11-10',
            status: 'complete' as const,
            comments: [],
            attachments: []
          },
          {
            id: 'task-4',
            title: 'Panel installation',
            description: 'Install solar panels and complete wiring',
            assignee: 'user-liam-miller',
            dueDate: '2024-11-20',
            status: 'in_progress' as const,
            comments: [],
            attachments: []
          },
          {
            id: 'task-5',
            title: 'Inverter and electrical',
            description: 'Install inverters and complete electrical connections',
            assignee: 'user-alex-johnson',
            dueDate: null,
            status: 'not_started' as const,
            comments: [],
            attachments: []
          }
        ]
      }
    }
  },
  {
    name: 'Green Valley Industrial Park',
    location: 'Phoenix, AZ',
    priority: 2,
    owner: 'user-david-thompson',
    attachments: [],
    milestones: [],
    currentStageId: 'stage-3-permitting',
    stages: {
      'stage-3-permitting': {
        enteredAt: '2024-10-15T09:00:00Z',
        tasks: [
          {
            id: 'task-6',
            title: 'Submit permit applications',
            description: 'Submit all required building and electrical permits',
            assignee: 'user-grace-lee',
            dueDate: '2024-10-20',
            status: 'complete' as const,
            comments: [],
            attachments: []
          },
          {
            id: 'task-7',
            title: 'Utility interconnection agreement',
            description: 'Secure utility approval for grid connection',
            assignee: 'user-david-thompson',
            dueDate: '2024-11-01',
            status: 'in_progress' as const,
            comments: [],
            attachments: []
          },
          {
            id: 'task-8',
            title: 'Obtain permits',
            description: 'Receive all approved permits from authorities',
            assignee: '',
            dueDate: null,
            status: 'not_started' as const,
            comments: [],
            attachments: []
          }
        ]
      }
    }
  },
  {
    name: 'Riverside Office Complex',
    location: 'Austin, TX',
    priority: 3,
    owner: 'user-rachel-kim',
    attachments: [],
    milestones: [],
    currentStageId: 'stage-2-design',
    stages: {
      'stage-2-design': {
        enteredAt: '2024-11-20T10:00:00Z',
        tasks: [
          {
            id: 'task-9',
            title: 'System design',
            description: 'Design PV system layout and electrical specifications',
            assignee: 'user-alex-johnson',
            dueDate: '2024-11-25',
            status: 'complete' as const,
            comments: [],
            attachments: []
          },
          {
            id: 'task-10',
            title: 'Engineering drawings',
            description: 'Create detailed engineering and CAD drawings',
            assignee: 'user-emma-wilson',
            dueDate: '2024-12-05',
            status: 'in_progress' as const,
            comments: [],
            attachments: []
          },
          {
            id: 'task-11',
            title: 'Design review',
            description: 'Conduct internal design review and approval',
            assignee: 'user-olivia-brown',
            dueDate: null,
            status: 'not_started' as const,
            comments: [],
            attachments: []
          }
        ]
      }
    }
  },
  {
    name: 'Mountain View Residence',
    location: 'Denver, CO',
    priority: 4,
    owner: 'user-sarah-chen',
    attachments: [],
    milestones: [],
    currentStageId: 'stage-1-initiation',
    stages: {
      'stage-1-initiation': {
        enteredAt: '2024-12-10T11:00:00Z',
        tasks: [
          {
            id: 'task-12',
            title: 'Initial site assessment',
            description: 'Conduct preliminary site visit and feasibility analysis',
            assignee: 'user-james-anderson',
            dueDate: '2024-12-15',
            status: 'in_progress' as const,
            comments: [],
            attachments: []
          },
          {
            id: 'task-13',
            title: 'Project charter creation',
            description: 'Draft and approve project charter with stakeholders',
            assignee: 'user-sarah-chen',
            dueDate: null,
            status: 'not_started' as const,
            comments: [],
            attachments: []
          }
        ]
      }
    }
  },
  {
    name: 'Harbor Bay Warehouse',
    location: 'Seattle, WA',
    priority: 0,
    owner: 'user-william-davis',
    attachments: [],
    milestones: [],
    currentStageId: 'stage-4-procurement',
    stages: {
      'stage-4-procurement': {
        enteredAt: '2024-09-01T08:00:00Z',
        tasks: [
          {
            id: 'task-14',
            title: 'Equipment ordering',
            description: 'Order solar panels, inverters, and mounting hardware',
            assignee: 'user-sophia-garcia',
            dueDate: null,
            status: 'not_started' as const,
            comments: [],
            attachments: []
          },
          {
            id: 'task-15',
            title: 'Delivery coordination',
            description: 'Coordinate delivery schedule with site readiness',
            assignee: 'user-william-davis',
            dueDate: null,
            status: 'not_started' as const,
            comments: [],
            attachments: []
          }
        ]
      }
    }
  },
  {
    name: 'Oak Street Apartments',
    location: 'Portland, OR',
    priority: 2,
    owner: 'user-michael-roberts',
    attachments: [],
    milestones: [],
    currentStageId: 'stage-6-commissioning',
    stages: {
      'stage-6-commissioning': {
        enteredAt: '2024-12-01T09:00:00Z',
        tasks: [
          {
            id: 'task-16',
            title: 'System testing',
            description: 'Test all electrical systems and performance',
            assignee: 'user-james-anderson',
            dueDate: '2024-12-05',
            status: 'complete' as const,
            comments: [],
            attachments: []
          },
          {
            id: 'task-17',
            title: 'Final inspection',
            description: 'Pass final inspection from building department',
            assignee: 'user-grace-lee',
            dueDate: '2024-12-10',
            status: 'complete' as const,
            comments: [],
            attachments: []
          },
          {
            id: 'task-18',
            title: 'Utility approval',
            description: 'Obtain permission to operate from utility',
            assignee: 'user-michael-roberts',
            dueDate: '2024-12-18',
            status: 'in_progress' as const,
            comments: [],
            attachments: []
          }
        ]
      }
    }
  }
];
