import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Book as BookIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

const Syllabus = () => {
  const [selectedExam, setSelectedExam] = useState(0);
  const [error, setError] = useState('');

  const handleExamChange = (event, newValue) => {
    setSelectedExam(newValue);
  };

  const syllabusData = {
    gpat: [
      {
        subject: 'Pharmaceutical Chemistry',
        topics: [
          {
            title: 'Medicinal Chemistry',
            subtopics: [
              'Drug metabolism and biotransformation',
              'Structure Activity Relationship (SAR)',
              'Drug discovery and development',
              'Synthetic procedures of selected drugs',
            ],
            weightage: '25%'
          },
          {
            title: 'Pharmaceutical Analysis',
            subtopics: [
              'Chromatographic methods',
              'Spectroscopic techniques',
              'Quality control and quality assurance',
              'Pharmacopoeial assays',
            ],
            weightage: '15%'
          }
        ]
      },
      {
        subject: 'Pharmaceutics',
        topics: [
          {
            title: 'Physical Pharmaceutics',
            subtopics: [
              'States of matter and properties of solids',
              'Surface and interfacial phenomena',
              'Particle size and particle statistics',
              'Rheology and viscosity',
            ],
            weightage: '20%'
          },
          {
            title: 'Pharmaceutical Technology',
            subtopics: [
              'Pharmaceutical unit operations',
              'Pharmaceutical dosage forms',
              'Novel drug delivery systems',
              'Biopharmaceutics and pharmacokinetics',
            ],
            weightage: '20%'
          }
        ]
      }
    ],
    niper: [
      {
        subject: 'Pharmaceutical Sciences',
        topics: [
          {
            title: 'Drug Design and Discovery',
            subtopics: [
              'Computer-aided drug design',
              'Combinatorial chemistry',
              'Drug targets and molecular modeling',
              'Lead optimization strategies',
            ],
            weightage: '30%'
          },
          {
            title: 'Advanced Pharmaceutics',
            subtopics: [
              'Advanced drug delivery systems',
              'Targeted drug delivery',
              'Industrial pharmacy',
              'Validation and GMP',
            ],
            weightage: '30%'
          }
        ]
      },
      {
        subject: 'Research Methodology',
        topics: [
          {
            title: 'Research Methods',
            subtopics: [
              'Experimental design',
              'Statistical analysis',
              'Scientific writing',
              'Research ethics',
            ],
            weightage: '20%'
          }
        ]
      }
    ]
  };

  const fetchSyllabusData = async () => {
    try {
      console.log('Syllabus data fetched successfully:', syllabusData);
    } catch (error) {
      console.error('Error fetching syllabus data:', error);
      setError('Failed to fetch syllabus data. Please try again later.');
    }
  };

  useEffect(() => {
    fetchSyllabusData();
  }, []);

  const renderSyllabus = (examType) => {
    return syllabusData[examType].map((section, index) => (
      <Box key={index} sx={{ mb: 4 }}>
        <Typography variant="h5" color="primary" gutterBottom>
          {section.subject}
        </Typography>
        {section.topics.map((topic, topicIndex) => (
          <Accordion key={topicIndex} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Typography variant="h6">{topic.title}</Typography>
                <Chip label={topic.weightage} color="primary" size="small" sx={{ ml: 2 }} />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {topic.subtopics.map((subtopic, subtopicIndex) => (
                  <ListItem key={subtopicIndex}>
                    <ListItemIcon>
                      <CheckCircleIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={subtopic} />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    ));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Syllabus Information
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs
            value={selectedExam}
            onChange={handleExamChange}
            variant="fullWidth"
            aria-label="exam syllabus tabs"
          >
            <Tab 
              icon={<BookIcon />} 
              label="GPAT" 
              iconPosition="start"
            />
            <Tab 
              icon={<BookIcon />} 
              label="NIPER" 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {selectedExam === 0 && renderSyllabus('gpat')}
        {selectedExam === 1 && renderSyllabus('niper')}
      </Paper>
    </Container>
  );
};

export default Syllabus;
