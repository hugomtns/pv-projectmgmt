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
    owner: 'Sarah Johnson',
    currentStageId: 'stage-5-construction',
    stages: {
      'stage-1-initiation': {
        enteredAt: '2024-01-15T10:00:00Z',
        tasks: [
          {
            id: 'task-1',
            name: 'Initial site assessment',
            status: 'complete' as const
          },
          {
            id: 'task-2',
            name: 'Project charter creation',
            status: 'complete' as const
          }
        ]
      },
      'stage-5-construction': {
        enteredAt: '2024-11-01T08:00:00Z',
        tasks: [
          {
            id: 'task-3',
            name: 'Site preparation',
            status: 'complete' as const
          },
          {
            id: 'task-4',
            name: 'Panel installation',
            status: 'in_progress' as const
          },
          {
            id: 'task-5',
            name: 'Inverter and electrical',
            status: 'not_started' as const
          }
        ]
      }
    }
  },
  {
    name: 'Green Valley Industrial Park',
    location: 'Phoenix, AZ',
    priority: 2,
    owner: 'James Martinez',
    currentStageId: 'stage-3-permitting',
    stages: {
      'stage-3-permitting': {
        enteredAt: '2024-10-15T09:00:00Z',
        tasks: [
          {
            id: 'task-6',
            name: 'Submit permit applications',
            status: 'complete' as const
          },
          {
            id: 'task-7',
            name: 'Utility interconnection agreement',
            status: 'in_progress' as const
          },
          {
            id: 'task-8',
            name: 'Obtain permits',
            status: 'not_started' as const
          }
        ]
      }
    }
  },
  {
    name: 'Riverside Office Complex',
    location: 'Austin, TX',
    priority: 3,
    owner: 'Emily Rodriguez',
    currentStageId: 'stage-2-design',
    stages: {
      'stage-2-design': {
        enteredAt: '2024-11-20T10:00:00Z',
        tasks: [
          {
            id: 'task-9',
            name: 'System design',
            status: 'complete' as const
          },
          {
            id: 'task-10',
            name: 'Engineering drawings',
            status: 'in_progress' as const
          },
          {
            id: 'task-11',
            name: 'Design review',
            status: 'not_started' as const
          }
        ]
      }
    }
  },
  {
    name: 'Mountain View Residence',
    location: 'Denver, CO',
    priority: 4,
    owner: 'David Kim',
    currentStageId: 'stage-1-initiation',
    stages: {
      'stage-1-initiation': {
        enteredAt: '2024-12-10T11:00:00Z',
        tasks: [
          {
            id: 'task-12',
            name: 'Initial site assessment',
            status: 'in_progress' as const
          },
          {
            id: 'task-13',
            name: 'Project charter creation',
            status: 'not_started' as const
          }
        ]
      }
    }
  },
  {
    name: 'Harbor Bay Warehouse',
    location: 'Seattle, WA',
    priority: 0,
    owner: 'Lisa Anderson',
    currentStageId: 'stage-4-procurement',
    stages: {
      'stage-4-procurement': {
        enteredAt: '2024-09-01T08:00:00Z',
        tasks: [
          {
            id: 'task-14',
            name: 'Equipment ordering',
            status: 'not_started' as const
          },
          {
            id: 'task-15',
            name: 'Delivery coordination',
            status: 'not_started' as const
          }
        ]
      }
    }
  },
  {
    name: 'Oak Street Apartments',
    location: 'Portland, OR',
    priority: 2,
    owner: 'Robert Taylor',
    currentStageId: 'stage-6-commissioning',
    stages: {
      'stage-6-commissioning': {
        enteredAt: '2024-12-01T09:00:00Z',
        tasks: [
          {
            id: 'task-16',
            name: 'System testing',
            status: 'complete' as const
          },
          {
            id: 'task-17',
            name: 'Final inspection',
            status: 'complete' as const
          },
          {
            id: 'task-18',
            name: 'Utility approval',
            status: 'in_progress' as const
          }
        ]
      }
    }
  }
];
